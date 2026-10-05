import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import { monadTestnet } from "viem/chains";
import { usdFromBaseUnits } from "../lib/amount";
import {
	isExpired,
	markNonceUsed,
	type RefusalKind,
	refusalBody,
	refusalTitle,
	usedNonces,
} from "../lib/guards";
import {
	explorerTx,
	hasAlreadyPaid,
	payRequest,
	type Receipt,
} from "../lib/pay";
import { loadReceipt, saveReceipt } from "../lib/receipt";
import type { DecodedRequest } from "../lib/request";
import { decodeLink, verifyRequest } from "../lib/request";
import { StatusSwap } from "./StatusSwap";

// Verifying before deciding, then one explicit Pay. Every refusal happens before
// the payer is asked to confirm, and each class carries the sentence + next action
// from guards.ts rather than ad-hoc copy.
type Stage =
	| { kind: "checking" }
	| { kind: "refused"; reason: RefusalKind }
	| { kind: "ready"; request: DecodedRequest; alreadyPaid: boolean }
	| { kind: "submitting" }
	| { kind: "confirming"; hash: `0x${string}` }
	| { kind: "paid"; receipt: Receipt }
	| { kind: "needsWallet" }
	| { kind: "failed"; reason: string; request: DecodedRequest };

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
			setStage({ kind: "refused", reason: "unreadable" });
			return;
		}
		(async () => {
			// Gate order matters: the signature decides whether the terms are real,
			// then expiry decides whether they are still payable, then the ledger and
			// the chain decide whether this payer already did it.
			if (!(await verifyRequest(decoded, decoded.signature))) {
				if (!cancelled) setStage({ kind: "refused", reason: "bad-signature" });
				return;
			}
			if (isExpired(decoded, Math.floor(Date.now() / 1000))) {
				if (!cancelled) setStage({ kind: "refused", reason: "expired" });
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

	// A payer who returns to the same link must not be charged twice. Three
	// guards in order of cost: the local receipt and the persisted nonce ledger
	// are free, and the on-chain Transfer scan is the authority that survives a
	// cleared browser. The last one must never block paying - a failed scan
	// leaves the request payable rather than stranding the payer.
	useEffect(() => {
		if (stage.kind !== "ready") return;
		const seen = loadReceipt(stage.request.nonce);
		if (seen) {
			setStage({ kind: "paid", receipt: seen });
			return;
		}
		if (usedNonces().has(stage.request.nonce)) {
			setStage({ kind: "ready", request: stage.request, alreadyPaid: true });
			return;
		}
		const wallet = wallets?.[0];
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
			// Burn the nonce locally too: a reload then cannot offer a second pay
			// even before the chain scan catches up.
			markNonceUsed(request.nonce);
			saveReceipt(request.nonce, receipt);
			setStage({ kind: "paid", receipt });
		} catch {
			setStage({
				kind: "failed",
				reason: "That didn't go through. Your money hasn't moved — try again.",
				request,
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

	if (stage.kind === "refused") {
		return (
			<main className="ppp">
				<h1>{refusalTitle(stage.reason)}</h1>
				<p className="muted">{refusalBody(stage.reason)}</p>
			</main>
		);
	}

	if (stage.kind === "paid") {
		const { receipt } = stage;
		return (
			<main className="ppp">
				<p className="muted">Paid</p>
				<h1>{usdFromBaseUnits(receipt.amount)}</h1>
				<StatusSwap kind="swap" />
				<p className="muted">{`Sent to ${receipt.recipient}`}</p>
				<p className="muted">
					{new Date(receipt.paidAt * 1000).toLocaleString("en-US", {
						dateStyle: "medium",
						timeStyle: "short",
					})}
				</p>
				<a href={explorerTx(receipt.hash)} target="_blank" rel="noreferrer">
					View on MonadScan
				</a>
			</main>
		);
	}

	if (stage.kind === "needsWallet") {
		return (
			<main className="ppp">
				<h1>Create your wallet to pay</h1>
				<p className="muted">One tap. No seed phrase, no app install.</p>
				<button type="button" onClick={login}>
					Get started
				</button>
			</main>
		);
	}

	if (stage.kind === "submitting" || stage.kind === "confirming") {
		return (
			<main className="ppp">
				<h1>
					{stage.kind === "submitting"
						? "Waiting for your approval…"
						: "Finishing your payment…"}
				</h1>
				<p className="muted">This takes a second.</p>
				<StatusSwap kind="pending" />
			</main>
		);
	}

	if (stage.kind === "failed") {
		return (
			<main className="ppp">
				<h1>That didn't go through</h1>
				<p className="muted">{stage.reason}</p>
				<button type="button" onClick={() => pay(stage.request)}>
					Try again
				</button>
			</main>
		);
	}

	const { request, alreadyPaid } = stage;
	return (
		<main className="ppp">
			<h1>Payment request</h1>
			<p className="balance">{usdFromBaseUnits(request.amount)}</p>
			{description && <p className="muted">{description}</p>}
			<p className="muted">{`To ${request.recipient}`}</p>
			{alreadyPaid ? (
				<p className="muted">You already paid this.</p>
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
