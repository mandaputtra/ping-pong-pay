import { CalendarBlank, Lock, ShieldCheck } from "@phosphor-icons/react";
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

// The pen drew this at 390px, so there is no desktop layout to scale up into.
// Past 600px the card stops growing and sits centred rather than stretching into a
// shape the design never intended. Height is left to the content: a full-height
// shell plus justify-center parked the card in the middle of tall viewports and
// left a void above and below it, where the reference puts content at the top.
const SHELL = "mx-auto w-full max-w-[600px] px-4 pt-6 pb-2";
const CARD =
	"rounded-[20px] border border-[var(--line-card)] bg-[var(--surface-card)] p-6 text-center shadow-[0_18px_44px_rgb(2_6_23/0.28)] sm:p-8";
// Dark ink on the accent fills, not white. White on the violet is 3.08:1 and on
// the teal 2.05:1; both fail WCAG AA for 17px text. Dark ink passes at 6.2:1 and
// 9.3:1 and is what every real fintech CTA does on a saturated fill.
const CTA = (fill: "violet" | "teal") =>
	`flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-[17px] font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
		fill === "teal"
			? "bg-[var(--accent-teal)] text-[#04201e]"
			: "bg-[var(--accent)] text-white"
	}`;

function shortAddress(address: string): string {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PayRequest({
	slug,
	description,
	requesterName,
}: {
	slug: string;
	description: string;
	requesterName: string;
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
				reason: "That didn't go through. Your money hasn't moved. Try again.",
				request,
			});
		}
	}

	if (stage.kind === "checking" || !ready) {
		return (
			<main className={SHELL}>
				<p className="text-center text-sm text-[var(--text-muted)]">
					Checking request…
				</p>
			</main>
		);
	}

	if (stage.kind === "refused") {
		return (
			<main className={SHELL}>
				<div className={CARD}>
					<p className="text-sm font-semibold tracking-wide text-[var(--danger)] uppercase">
						{refusalTitle(stage.reason)}
					</p>
					<p className="mt-3 text-base text-[var(--text-muted)]">
						{refusalBody(stage.reason)}
					</p>
				</div>
			</main>
		);
	}

	if (stage.kind === "paid") {
		const { receipt } = stage;
		return (
			<main className={SHELL}>
				<div className={CARD}>
					<div
						className="mx-auto flex size-16 items-center justify-center rounded-full bg-[rgba(52,211,153,0.09)]"
						aria-hidden="true"
					>
						<StatusSwap kind="swap" />
					</div>
					<p className="mt-6 text-sm font-semibold tracking-widest text-[var(--success)] uppercase">
						Paid
					</p>
					<p className="mt-2 text-[48px] leading-[1.1] font-bold tracking-tight tabular-nums">
						{usdFromBaseUnits(receipt.amount)}
					</p>
					{description && (
						<p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
							{description}
						</p>
					)}
					<p className="mt-7 text-xs text-[var(--text-subtle)]">Sent to</p>
					<p className="mt-0.5 text-[13px] font-medium text-[var(--text-muted)]">
						{shortAddress(receipt.recipient)}
					</p>
					<p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--text-subtle)]">
						<CalendarBlank
							weight="fill"
							aria-hidden="true"
							className="size-3"
						/>
						{new Date(receipt.paidAt * 1000).toLocaleString("en-US", {
							dateStyle: "medium",
							timeStyle: "short",
						})}
					</p>
					<a
						className="mt-8 inline-block text-[13px] text-[var(--text-subtle)] underline underline-offset-4 transition-colors hover:text-[var(--text-muted)]"
						href={explorerTx(receipt.hash)}
						target="_blank"
						rel="noreferrer"
					>
						View on MonadScan
					</a>
				</div>
			</main>
		);
	}

	if (stage.kind === "needsWallet") {
		return (
			<main className={SHELL}>
				<div className={CARD}>
					<h1 className="text-xl font-bold">Create your wallet to pay</h1>
					<p className="mt-2 text-sm text-[var(--text-muted)]">
						One tap. No seed phrase, no app install.
					</p>
					<button
						type="button"
						className={`${CTA("violet")} mt-6`}
						onClick={login}
					>
						Get started
					</button>
				</div>
			</main>
		);
	}

	if (stage.kind === "submitting" || stage.kind === "confirming") {
		return (
			<main className={SHELL}>
				<div className={CARD}>
					<StatusSwap kind="pending" />
					<h1 className="mt-4 text-xl font-bold">
						{stage.kind === "submitting"
							? "Waiting for your approval…"
							: "Finishing your payment…"}
					</h1>
					<p className="mt-2 text-sm text-[var(--text-muted)]">
						This takes a second.
					</p>
				</div>
			</main>
		);
	}

	if (stage.kind === "failed") {
		return (
			<main className={SHELL}>
				<div className={CARD}>
					<p className="text-sm font-semibold tracking-wide text-[var(--danger)] uppercase">
						That didn't go through
					</p>
					<p className="mt-3 text-base text-[var(--text-muted)]">
						{stage.reason}
					</p>
					<button
						type="button"
						className={`${CTA("violet")} mt-6`}
						onClick={() => pay(stage.request)}
					>
						Try again
					</button>
				</div>
			</main>
		);
	}

	const { request, alreadyPaid } = stage;
	const who = requesterName || "this freelancer";
	const amount = usdFromBaseUnits(request.amount);
	// The pen flips the CTA colour once the payer is signed in: violet while there
	// is still a login step between them and the payment, teal when the next tap
	// moves the money. Teal is the action colour across the product, so the flip
	// means something rather than being decoration.
	const signedIn = Boolean(authenticated && user);
	return (
		<main className={SHELL}>
			<div className={CARD}>
				<p className="flex items-center justify-center gap-2 pb-3 text-[13px] font-semibold tracking-[0.5px] text-[var(--accent-teal)]">
					<ShieldCheck weight="fill" aria-hidden="true" className="size-4" />
					{`Verified request from ${who}`}
				</p>
				<div className="border-t border-[var(--line-card)]" />
				<p className="mt-4 text-sm text-[var(--text-muted)]">{`${who} is asking for`}</p>
				<p className="mt-1 text-[56px] leading-[1.1] font-bold tracking-tight tabular-nums">
					{amount}
				</p>
				{description && (
					<p className="mt-2 text-base text-[var(--text-muted)]">
						{description}
					</p>
				)}
				<p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-subtle)]">
					<span
						className="size-5 shrink-0 rounded-full bg-[var(--surface-elevated)]"
						aria-hidden="true"
					/>
					To
					<code
						className="rounded-none border-0 bg-transparent p-0 text-xs font-medium text-[var(--text-subtle)]"
						title={request.recipient}
					>
						{shortAddress(request.recipient)}
					</code>
				</p>
				<p className="mt-5 flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent-teal-dim)] px-3 py-2.5 text-xs text-[var(--accent-teal)]">
					<Lock weight="fill" aria-hidden="true" className="size-3 shrink-0" />
					The amount is signed and cannot be changed.
				</p>
				{alreadyPaid ? (
					<button type="button" disabled className={`${CTA("teal")} mt-6`}>
						You already paid this
					</button>
				) : signedIn ? (
					<button
						type="button"
						className={`${CTA("teal")} mt-6`}
						onClick={() => pay(request)}
					>
						{`Pay ${amount}`}
					</button>
				) : (
					<button
						type="button"
						className={`${CTA("violet")} mt-6`}
						onClick={login}
					>
						Get started
					</button>
				)}
			</div>
		</main>
	);
}
