import type { PaymentRequest } from "./request";

// Every refusal is a decision made before the payer is asked to confirm, so each
// one has to say what happened and what to do next - in the payer's language, not
// the protocol's. One sentence per class, no jargon, no hashes.

export type RefusalKind =
	| "unreadable"
	| "bad-signature"
	| "expired"
	| "already-paid";

const COPY: Record<RefusalKind, { title: string; body: string }> = {
	unreadable: {
		title: "This link isn't a payment request",
		body: "It may have been cut off when it was copied. Ask for a fresh link.",
	},
	"bad-signature": {
		title: "Don't pay this one",
		body: "This request doesn't match what your client signed, so something in the link was changed. Ask them to send it again.",
	},
	expired: {
		title: "This link has expired",
		body: "Ask your client for a new link and pay through that one instead.",
	},
	"already-paid": {
		title: "You've already paid this",
		body: "This request has been paid, so there's nothing left to send.",
	},
};

// Title and body stay separate at the source. Joining them into one string here
// and re-parsing it at the screen would be the fragile version of the same copy.
export function refusalTitle(kind: RefusalKind): string {
	return COPY[kind].title;
}

export function refusalBody(kind: RefusalKind): string {
	return COPY[kind].body;
}

export function refusalFor(kind: RefusalKind): string {
	return `${COPY[kind].title}. ${COPY[kind].body}`;
}

// The expiry instant itself counts as expired: a request is payable up to, but
// not including, its expiry.
export function isExpired(
	request: PaymentRequest,
	nowSeconds: number,
): boolean {
	return nowSeconds >= Number(request.expiry);
}

const NONCE_KEY = "ppp:used-nonces";

// Nonces already spent by this browser. Persisted, so a reload cannot resurrect a
// spent request. A convenience ledger for the payer: the chain is what actually
// prevents a second transfer.

export function usedNonces(storage: Storage = localStorage): Set<string> {
	try {
		const raw = storage.getItem(NONCE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
	} catch {
		return new Set();
	}
}

export function markNonceUsed(
	nonce: string,
	storage: Storage = localStorage,
): void {
	try {
		const next = usedNonces(storage);
		next.add(nonce);
		storage.setItem(NONCE_KEY, JSON.stringify([...next]));
	} catch {
		// A full or blocked store must never undo a payment that already landed;
		// the on-chain scan in pay.ts is the real guard.
	}
}
