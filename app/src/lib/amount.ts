import { formatUnits, parseUnits } from "viem";

// Amount entry is the one input that becomes money, so it is validated before it
// can reach a signature. USD is the product's language (see CONTEXT.md), so the
// cap is expressed in dollars and converted at the boundary.

export const MAX_REQUEST_USD = 5000;
const USDC_DECIMALS = 6;

export type AmountResult =
	| { ok: true; baseUnits: string; dollars: string }
	| { ok: false; reason: string };

export function parseAmount(input: string): AmountResult {
	const trimmed = input.trim();
	if (trimmed === "") return { ok: false, reason: "Enter an amount." };
	if (!/^\d+(\.\d{1,2})?$/.test(trimmed))
		return { ok: false, reason: "Use dollars, up to two decimal places." };

	const value = Number(trimmed);
	if (!Number.isFinite(value) || value <= 0)
		return { ok: false, reason: "Enter an amount above zero." };
	if (value > MAX_REQUEST_USD)
		return {
			ok: false,
			reason: `Keep it under $${MAX_REQUEST_USD.toLocaleString("en-US")}.`,
		};

	return {
		ok: true,
		baseUnits: parseUnits(trimmed, USDC_DECIMALS).toString(),
		dollars: Number(value.toFixed(2)).toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}),
	};
}

export function usdFromBaseUnits(baseUnits: string): string {
	const [whole, frac = ""] = formatUnits(
		BigInt(baseUnits),
		USDC_DECIMALS,
	).split(".");
	return `$${Number(whole).toLocaleString("en-US")}.${`${frac}00`.slice(0, 2)}`;
}
