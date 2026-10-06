import { useState } from "react";
import { parseUnits } from "viem";
import { usdFromBaseUnits } from "../lib/amount";

// No off-ramp ships. This screen exists so the demo can show the shape of a
// cash-out and stop there: no contract behind it, no custodian, no bank. Every
// state says so in words, not only in styling, so a screenshot can never be
// mistaken for a real payout.

type Stage = { kind: "form" } | { kind: "processing" } | { kind: "done" };

export function Withdraw({ balance }: { balance: string }) {
	const [amount, setAmount] = useState("");
	const [stage, setStage] = useState<Stage>({ kind: "form" });
	const [error, setError] = useState("");

	// balance arrives as a decimal string from getBalance; work in base units so
	// the comparison never goes through a float.
	const available = parseUnits(balance || "0", 6);
	let requested = 0n;
	try {
		requested = parseUnits(amount.trim() || "0", 6);
	} catch {
		requested = 0n;
	}
	const overBalance = requested > available;

	async function start() {
		if (requested <= 0n) {
			setError("Enter an amount above zero.");
			return;
		}
		if (overBalance) {
			setError(
				`You only have ${usdFromBaseUnits(available.toString())} available.`,
			);
			return;
		}
		setError("");
		setStage({ kind: "processing" });
		// Nothing is submitted anywhere. This pause is the demo showing the flow.
		await new Promise((resolve) => setTimeout(resolve, 900));
		setStage({ kind: "done" });
	}

	return (
		<section className="ppp-card">
			<h2>Cash out</h2>
			<p className="sim-badge" role="note">
				Simulated. No real money moves.
			</p>
			{stage.kind === "done" ? (
				<div>
					<p className="balance-sm">{usdFromBaseUnits(requested.toString())}</p>
					<p className="muted">Requested to your bank account</p>
					<p role="status" className="sim-note">
						This is a demo. Nothing was sent to a bank and your balance is
						unchanged.
					</p>
					<button
						type="button"
						className="ghost"
						onClick={() => setStage({ kind: "form" })}
					>
						Back
					</button>
				</div>
			) : (
				<div>
					<label className="ppp-field">
						<span>Amount (USDC)</span>
						<input
							inputMode="decimal"
							placeholder="10.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							disabled={stage.kind === "processing"}
						/>
					</label>
					<p className="muted">To: your bank account (not connected)</p>
					<p className="muted">{`Available: ${usdFromBaseUnits(available.toString())}`}</p>
					<button
						type="button"
						onClick={start}
						disabled={stage.kind === "processing"}
					>
						{stage.kind === "processing" ? "Requesting…" : "Cash out"}
					</button>
					<p className="sim-note">
						Demo only. No bank is connected and no transfer is made.
					</p>
					{error && (
						<p role="alert" className="error">
							{error}
						</p>
					)}
				</div>
			)}
		</section>
	);
}
