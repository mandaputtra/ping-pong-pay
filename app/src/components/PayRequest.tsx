import {
	CalendarBlank,
	CreditCard,
	Lock,
	ShieldCheck,
} from "@phosphor-icons/react";
import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import { monadTestnet } from "viem/chains";
import { usdFromBaseUnits } from "../lib/amount";
import {
	fetchRequest,
	markPaid,
	settleCardCheckout,
	startCardCheckout,
} from "../lib/api";
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
import { decodeLink, encodeSignedBlob, verifyRequest } from "../lib/request";
import { Sheet } from "./Sheet";
import { StatusSwap } from "./StatusSwap";

// Verifying before deciding, then one explicit Pay. Every refusal happens before
// the payer is asked to confirm, and each class carries the sentence + next action
// from guards.ts rather than ad-hoc copy.
type Stage =
	| { kind: "checking" }
	| { kind: "refused"; reason: RefusalKind }
	| {
			kind: "ready";
			request: DecodedRequest;
			alreadyPaid: boolean;
			rowId: string | null;
	  }
	| { kind: "submitting" }
	| { kind: "confirming"; hash: `0x${string}` }
	| { kind: "paid"; receipt: Receipt }
	| { kind: "needsWallet" }
	| { kind: "failed"; reason: string; request: DecodedRequest };

// One mobile column at every width, matching the reference: the card stops
// growing at 600px rather than stretching into a shape the design never
// intended. Height is left to the content, because a full-height shell with
// justify-center parks the card in the middle of tall viewports and leaves
// voids above and below it. The outer page column owns the background and the
// header/footer edges; this shell only places the card.
const SHELL = "w-full px-4 pt-6 pb-2";
// Bottom padding is a step larger than the top. The CTA is the last element in
// the card and symmetric padding reads as cramped under it.
const CARD =
	"rounded-[20px] border border-[var(--line-card)] bg-[var(--surface-card)] px-6 pt-6 pb-8 text-center shadow-[0_18px_40px_rgb(36_51_61/0.10)] sm:px-8 sm:pt-8 sm:pb-10";
// Both fills take the shared on-accent ink. White on the light teal is 5.3:1
// and on the light violet higher; no per-fill ink needed in light-only.
const CTA = (fill: "violet" | "teal") =>
	`flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-[17px] font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
		fill === "teal"
			? "bg-[var(--accent-teal)] text-[var(--text-on-accent)]"
			: "bg-[var(--accent)] text-[var(--text-on-accent)]"
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
	// Card leg (ADR-0002). Kept separate from `stage` because it can run while
	// signed out: a card payer never gets a wallet at all.
	const [cardOpen, setCardOpen] = useState(false);
	const [cardBusy, setCardBusy] = useState(false);
	const [cardError, setCardError] = useState("");

	useEffect(() => {
		let cancelled = false;
		// A short ULID slug resolves to the requester's signed blob, which then
		// goes through the same decode + verify path as a self-describing
		// link. Old long links skip the lookup and decode directly, so nothing
		// already shared breaks.
		(async () => {
			let blob = slug;
			let rowId: string | null = null;
			if (/^[0-9A-Z]{26}$/.test(slug)) {
				const found = await fetchRequest(slug);
				if (found) {
					const r = found.request;
					blob = encodeSignedBlob({
						...r,
						signature: r.signature as `0x${string}`,
					});
					rowId = r.id;
				}
			}
			const decoded = decodeLink(blob);
			if (!decoded) {
				if (!cancelled) setStage({ kind: "refused", reason: "unreadable" });
				return;
			}
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
				setStage({
					kind: "ready",
					request: decoded,
					alreadyPaid: false,
					rowId,
				});
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
			setStage({
				kind: "ready",
				request: stage.request,
				alreadyPaid: true,
				rowId: stage.rowId,
			});
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
						rowId: stage.rowId,
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

	async function pay(request: DecodedRequest, rowId: string | null) {
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
			// Best-effort: the row's paid flag is history, not a payment guard.
			// The browser's nonce ledger and the chain scan above are what stop a
			// second charge, so a failed marking must never surface as an error.
			if (rowId) markPaid(rowId, receipt.hash).catch(() => {});
			setStage({ kind: "paid", receipt });
		} catch {
			setStage({
				kind: "failed",
				reason: "That didn't go through. Your money hasn't moved. Try again.",
				request,
			});
		}
	}

	// Card leg (ADR-0002): open a checkout for this request row, then settle it.
	// The relayer pays the freelancer from its float, so the payer needs no
	// wallet and no gas. Only links filed under a ULID have a row to settle.
	async function payWithCard(request: DecodedRequest, rowId: string | null) {
		if (!rowId) {
			setCardError("This link predates card checkout. Use a wallet instead.");
			return;
		}
		setCardError("");
		setCardBusy(true);
		try {
			const opened = await startCardCheckout(rowId);
			if (!opened) throw new Error("checkout failed");
			const settled = await settleCardCheckout(opened.session.id);
			if (!settled) throw new Error("settle failed");
			markNonceUsed(request.nonce);
			const receipt: Receipt = {
				hash: settled.hash as `0x${string}`,
				amount: request.amount,
				recipient: request.recipient,
				paidAt: Math.floor(Date.now() / 1000),
			};
			saveReceipt(request.nonce, receipt);
			setCardOpen(false);
			setStage({ kind: "paid", receipt });
		} catch {
			setCardError("That card payment didn't go through. Try again.");
		} finally {
			setCardBusy(false);
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
						onClick={() => pay(stage.request, null)}
					>
						Try again
					</button>
				</div>
			</main>
		);
	}

	const { request, alreadyPaid, rowId } = stage;
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
				) : (
					<>
						<button
							type="button"
							className={`${CTA("teal")} mt-6 gap-2`}
							onClick={() => setCardOpen(true)}
							disabled={!rowId}
						>
							<CreditCard weight="bold" aria-hidden="true" className="size-4" />
							{`Pay ${amount} by card`}
						</button>
						<button
							type="button"
							className={`${CTA("violet")} mt-2`}
							onClick={signedIn ? () => pay(request, rowId) : login}
						>
							{signedIn ? "Pay from wallet" : "Sign in to pay from wallet"}
						</button>
					</>
				)}
			</div>
			{cardOpen && (
				<Sheet title="Pay by card" onClose={() => setCardOpen(false)}>
					<div className="space-y-4">
						<p className="inline-block rounded-full bg-[var(--teal-wash)] px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[var(--teal-deep)] uppercase">
							Sandbox. No real money moves.
						</p>
						<p className="text-sm text-[var(--ink-soft)]">
							{`Paying ${amount} to ${who}. The card form stands in for a real processor (see ADR-0002); the USDC payout to them is real on testnet.`}
						</p>
						<button
							type="button"
							className={`${CTA("teal")} gap-2`}
							onClick={() => payWithCard(request, rowId)}
							disabled={cardBusy}
						>
							<CreditCard weight="bold" aria-hidden="true" className="size-4" />
							{cardBusy ? "Processing…" : `Pay ${amount}`}
						</button>
						{cardError && (
							<p role="alert" className="error">
								{cardError}
							</p>
						)}
					</div>
				</Sheet>
			)}
		</main>
	);
}
