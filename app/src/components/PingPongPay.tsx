import { useState } from "react";
import type { Address } from "viem";
import { friendlyError, topUp } from "../lib/topup";
import { connect, disconnect, getBalance, sessionAccount } from "../lib/wallet";

function dollars(raw: string): string {
	const [whole, frac = ""] = raw.split(".");
	return `$${Number(whole).toLocaleString("en-US")}.${`${frac}00`.slice(0, 2)}`;
}

export function PingPongPay() {
	const [address, setAddress] = useState<Address | null>(null);
	const [balance, setBalance] = useState("0.00");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function signIn() {
		setError("");
		try {
			const next = await connect();
			setBalance(await getBalance(next));
			setAddress(next);
		} catch (err) {
			setError(friendlyError(err));
		}
	}

	async function addMoney() {
		const account = sessionAccount();
		if (!account) {
			setError("Please sign in first.");
			return;
		}
		setError("");
		setBusy(true);
		try {
			await topUp(account.address);
			setBalance(await getBalance(account.address));
		} catch (err) {
			setError(friendlyError(err));
		} finally {
			setBusy(false);
		}
	}

	if (address === null) {
		return (
			<main className="ppp">
				<h1>Ping Pong Pay</h1>
				<p className="muted">
					Easy dollar payments. No passwords, no crypto fuss.
				</p>
				<button type="button" onClick={signIn}>
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
					onClick={() => {
						disconnect();
						setAddress(null);
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
