import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import { monadTestnet } from "viem/chains";
import { usdFromBaseUnits } from "../lib/amount";
import {
	explorerTx,
	hasAlreadyPaid,
	payRequest,
	type Receipt,
} from "../lib/pay";
import { loadReceipt, saveReceipt } from "../lib/receipt";
import type { DecodedRequest } from "../lib/request";
import { decodeLink, verifyRequest } from "../lib/request";

// Verifying before deciding, then one explicit Pay. The state machine is the
// product: checking -> ready -> submitting -> confirming -> paid, and the failure
// classes each collapse to one sentence the payer can act on.
type Stage =
	| { kind: "checking" }
	| { kind: "invalid"; reason: string }
	| { kind: "expired" }
	| { kind: "ready"; request: DecodedRequest; alreadyPaid: boolean }
	| { kind: "submitting" }
	| { kind: "confirming"; hash: `0x${string}` }
	| { kind: "paid"; receipt: Receipt }
	| { kind: "needsWallet" }
	| { kind: "failed"; reason: string };

export function PayRequest({
	slug,
	description,
}: {
	slug: string;
	description: string;
}) {
	const { ready, authenticated, user } = usePrivy();
	const { login } = useLogin();
	const { wallets } = useWallets();
	const [stage, setStage] = useState<Stage>({ kind: "checking" });

	useEffect(() => {
		let cancelled = false;
		const decoded = decodeLink(slug);
		if (!decoded) {
			setStage({
				kind: "invalid",
				reason: "This link isn't a payment request.",
			});
			return;
		}
		(async () => {
			// The signature gate comes first: nothing about a request that fails
			// it is worth showing, and nothing can be signed against it.
			if (!(await verifyRequest(decoded, decoded.signature))) {
				if (cancelled) return;
				setStage({
					kind: "invalid",
					reason: "This request doesn't match the freelancer's signature.",
				});
				return;
			}
			if (Number(decoded.expiry) * 1000 < Date.now()) {
				if (cancelled) return;
				setStage({ kind: "expired" });
				return;
			}
			if (!cancelled) {
				setStage({ kind: "ready", request: decoded, alreadyPaid: false });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [slug]);

	// A payer who returns to the same link sees their receipt instead of a second
	// charge. The receipt in storage is a shortcut; the chain is the guard.
	useEffect(() => {
		if (stage.kind !== "ready") return;
		const wallet = wallets?.[0];
		const seen = loadReceipt(stage.request.nonce);
		if (seen) {
			setStage({ kind: "paid", receipt: seen });
			return;
		}
		if (!wallet) return;
		let cancelled = false;
		hasAlreadyPaid(wallet.address as `0x${string}`, stage.request).then(
			(paid) => {
				if (!cancelled && paid) {
					setStage({
						kind: "ready",
						request: stage.request,
						alreadyPaid: true,
					});
				}
			},
			() => {
				// A failed history scan must not stand between the payer and paying.
			},
		);
		return () => {
			cancelled = true;
		};
	}, [stage, wallets]);

	async function pay(request: DecodedRequest) {
		const wallet = wallets?.[0];
		if (!wallet) {
			setStage({ kind: "needsWallet" });
			return;
		}
		setStage({ kind: "submitting" });
		try {
			const client = createWalletClient({
				chain: monadTestnet,
				transport: custom(await wallet.getEthereumProvider()),
			});
			const receipt = await payRequest(
				client,
				wallet.address as `0x${string}`,
				request,
			);
			setStage({ kind: "confirming", hash: receipt.hash });
			saveReceipt(request.nonce, receipt);
			setStage({ kind: "paid", receipt });
		} catch {
			setStage({
				kind: "failed",
				reason: "We couldn't send that payment. Your money hasn't moved.",
			});
		}
	}

	if (stage.kind === "checking" || !ready) {
		return (
			<main className="ppp">
				<h1>Checking request…</h1>
			</main>
		);
	}

	if (stage.kind === "invalid" || stage.kind === "expired") {
		return (
			<main className="ppp">
				<h1>
					{stage.kind === "expired" ? "This link has expired" : "Invalid link"}
				</h1>
				<p className="muted">
					{stage.kind === "expired" ? "Ask for a fresh link." : stage.reason}
				</p>
			</main>
		);
	}

	if (stage.kind === "paid") {
		const { receipt } = stage;
		return (
			<main className="ppp">
				<p className="muted">Paid</p>
				<h1>{usdFromBaseUnits(receipt.amount)}</h1>
				<p className="muted">{`To ${receipt.recipient}`}</p>
				<p className="muted">
					{new Date(receipt.paidAt * 1000).toLocaleString("en-US", {
						dateStyle: "medium",
						timeStyle: "short",
					})}
				</p>
				<a href={explorerTx(receipt.hash)} target="_blank" rel="noreferrer">
					View on the blockchain
				</a>
			</main>
		);
	}

	if (stage.kind === "needsWallet") {
		return (
			<main className="ppp">
				<h1>One quick step</h1>
				<p className="muted">Create a wallet to send this payment.</p>
				<button type="button" onClick={login}>
					Get started
				</button>
			</main>
		);
	}
	if (stage.kind === "submitting" || stage.kind === "confirming") {
		return (
			<main className="ppp">
				<h1>{stage.kind === "submitting" ? "Sending…" : "Confirming…"}</h1>
				<p className="muted">Hang on, this takes a second.</p>
			</main>
		);
	}

	if (stage.kind === "failed") {
		return (
			<main className="ppp">
				<h1>That didn't go through</h1>
				<p className="muted">{stage.reason}</p>
			</main>
		);
	}

	const { request, alreadyPaid } = stage;
	return (
		<main className="ppp">
			<h1>Payment request</h1>
			<p className="balance">{usdFromBaseUnits(request.amount)}</p>
			{description && <p className="muted">{`For: ${description}`}</p>}
			<p className="muted">{`To ${request.recipient}`}</p>
			{alreadyPaid ? (
				<p className="muted">You've already paid this request.</p>
			) : authenticated && user ? (
				<button type="button" onClick={() => pay(request)}>
					Pay {usdFromBaseUnits(request.amount)}
				</button>
			) : (
				<button type="button" onClick={login}>
					Get started
				</button>
			)}
		</main>
	);
}
