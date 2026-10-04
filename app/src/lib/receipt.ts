import type { Receipt } from "./pay";

// A receipt is a convenience, not the guard against double-spending: the on-chain
// Transfer scan in pay.ts decides that. This only lets a returning payer see their
// receipt immediately instead of re-deriving it from a block explorer.

const KEY = "ppp:receipts";

export function saveReceipt(nonce: string, receipt: Receipt): void {
	try {
		const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<
			string,
			Receipt
		>;
		localStorage.setItem(KEY, JSON.stringify({ ...all, [nonce]: receipt }));
	} catch {
		// A full or disabled store must never break a payment that already went
		// through; the on-chain scan still prevents the second charge.
	}
}

export function loadReceipt(nonce: string): Receipt | null {
	try {
		const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<
			string,
			Receipt
		>;
		return all[nonce] ?? null;
	} catch {
		return null;
	}
}
