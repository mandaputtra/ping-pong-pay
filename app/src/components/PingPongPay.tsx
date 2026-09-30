import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { privyWalletAddress } from "../lib/privy-user";
import { friendlyError, topUp } from "../lib/topup";
import { getBalance } from "../lib/wallet";

function dollars(raw: string): string {
	const [whole, frac = ""] = raw.split(".");
	return `$${Number(whole).toLocaleString("en-US")}.${`${frac}00`.slice(0, 2)}`;
}

export function PingPongPay() {
	const { ready, authenticated, user } = usePrivy();
	const { login } = useLogin();
	const { logout } = useLogout();
	const [balance, setBalance] = useState("0.00");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const address: Address | null =
		authenticated && user ? privyWalletAddress(user) : null;

	useEffect(() => {
		if (!address) return;
		getBalance(address).then(setBalance, (err: unknown) =>
			setError(friendlyError(err)),
		);
	}, [address]);

	async function addMoney() {
		if (!address) {
			setError("Please sign in first.");
			return;
		}
		setError("");
		setBusy(true);
		try {
			await topUp(address);
			setBalance(await getBalance(address));
		} catch (err) {
			setError(friendlyError(err));
		} finally {
			setBusy(false);
		}
	}

	if (!ready) {
		return (
			<main className="ppp">
				<h1>Ping Pong Pay</h1>
				<p className="muted">Loading…</p>
			</main>
		);
	}

	if (address === null) {
		return (
			<main className="ppp">
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

	return (
		<main className="ppp">
			<h1>Ping Pong Pay</h1>
			<p className="muted">{`${address.slice(0, 6)}…${address.slice(-4)}`}</p>
			<p className="balance">{dollars(balance)}</p>
			<div className="ppp-row">
				<button type="button" onClick={addMoney} disabled={busy}>
					{busy ? "Adding money…" : "Add money"}
				</button>
				<button
					type="button"
					className="ghost"
					onClick={async () => {
						await logout();
					}}
				>
					Sign out
				</button>
			</div>
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
		</main>
	);
}
