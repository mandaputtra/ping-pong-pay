import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { fetchUser, saveShortName } from "../lib/api";
import { privyWalletAddress } from "../lib/privy-user";
import { friendlyError } from "../lib/topup";
import { getBalance } from "../lib/wallet";
import { ActivityList } from "./ActivityList";
import { RequestTile } from "./CreateRequest";
import { WithdrawTile } from "./Withdraw";

function dollars(raw: string): string {
	const [whole, frac = ""] = raw.split(".");
	return `$${Number(whole).toLocaleString("en-US")}.${`${frac}00`.slice(0, 2)}`;
}

function weekday(): string {
	return new Date()
		.toLocaleDateString("en-US", { weekday: "long" })
		.toUpperCase();
}

export function PingPongPay() {
	const { ready, authenticated, user } = usePrivy();
	const { login } = useLogin();
	const { logout } = useLogout();
	const [balance, setBalance] = useState("0.00");
	const [error, setError] = useState("");
	// The short name greets the user and signs their links. Unknown until the
	// database says otherwise: null means "not asked yet", not "no name".
	const [shortName, setShortName] = useState<string | null>(null);
	const [nameDraft, setNameDraft] = useState("");
	const [nameBusy, setNameBusy] = useState(false);

	const address: Address | null =
		authenticated && user ? privyWalletAddress(user) : null;

	// First sign-in has no row yet, so the database answers null and the form
	// below asks. A stored name skips the question entirely.
	useEffect(() => {
		if (!address) return;
		let cancelled = false;
		fetchUser(address).then((found) => {
			if (!cancelled) setShortName(found?.user?.short_name || "");
		});
		return () => {
			cancelled = true;
		};
	}, [address]);
	useEffect(() => {
		if (!address) return;
		getBalance(address).then(setBalance, (err: unknown) =>
			setError(friendlyError(err)),
		);
	}, [address]);

	if (!ready) {
		return (
			<main className="ppp ppp-center">
				<h1>Ping Pong Pay</h1>
				<p className="muted">Loading…</p>
			</main>
		);
	}

	if (address === null) {
		return (
			<main className="ppp ppp-center">
				<h1>Ping Pong Pay</h1>
				<p className="muted">
					Easy dollar payments. No passwords, no crypto fuss.
				</p>
				<button type="button" onClick={login}>
					Get started
				</button>
				{error && (
					<p role="alert" className="error">
						{error}
					</p>
				)}
			</main>
		);
	}

	// The name question blocks the dashboard, not the whole page: one field,
	// one button, asked once. After this the name signs links and greets.
	if (shortName === "") {
		return (
			<main className="ppp ppp-center">
				<h1>What should we call you?</h1>
				<p className="muted">
					A short name for your greeting and your payment links.
				</p>
				<label className="ppp-field">
					<span>Short name</span>
					<input
						placeholder="Avery"
						value={nameDraft}
						maxLength={40}
						onChange={(e) => setNameDraft(e.target.value)}
					/>
				</label>
				<button
					type="button"
					disabled={nameBusy || !nameDraft.trim()}
					onClick={async () => {
						if (!address) return;
						setNameBusy(true);
						const saved = await saveShortName(address, nameDraft.trim());
						// Without a database there is nothing to persist to; the
						// greeting falls back to the address chip below.
						if (saved) setShortName(saved.user.short_name);
						setNameBusy(false);
					}}
				>
					{nameBusy ? "Saving…" : "Save name"}
				</button>
			</main>
		);
	}

	// Reference layout: weekday eyebrow, serif greeting, teal balance card,
	// Request/Withdraw action tiles, then the request list. Everything below
	// reads top to bottom in that order; the legacy balance/buttons stay wired
	// underneath, just restyled into the tiles.
	return (
		<main className="mx-auto w-full max-w-[600px] px-4 pt-6 pb-2">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] uppercase">
						{weekday()} · Your workspace
					</p>
					<h1 className="mt-1 font-[family-name:var(--font-display)] text-[32px] leading-tight font-bold text-[var(--ink)]">
						{shortName ? `Good work, ${shortName}.` : "Good work."}
					</h1>
				</div>
				<button
					type="button"
					onClick={async () => {
						await logout();
					}}
					aria-label="Sign out"
					className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
				>
					Sign out
				</button>
			</div>
			<section
				aria-label="Available balance"
				className="mt-4 rounded-[22px] bg-[var(--teal)] p-5 text-white shadow-[0_18px_40px_rgb(47_92_85/0.28)]"
			>
				<div className="flex items-center justify-between">
					<p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-90">
						Available balance
					</p>
					<span className="rounded-full border border-white/40 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
						Demo mode
					</span>
				</div>
				<p className="mt-3 text-[44px] leading-none font-bold tracking-tight tabular-nums">
					{dollars(balance)}
				</p>
				<p className="mt-3 text-[13px] opacity-85">
					USD · simulated balance · updates automatically
				</p>
			</section>
			<div className="mt-3 grid grid-cols-2 gap-3">
				<RequestTile recipient={address} />
				<WithdrawTile balance={balance} />
			</div>
			<ActivityList address={address} />
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
		</main>
	);
}
