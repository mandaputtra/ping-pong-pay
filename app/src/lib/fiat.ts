// The fiat seam (ADR-0002). The card leg is custodial, so this lives on the
// relayer - the process that holds the USDC float - and not in the browser. A
// real processor replaces `sandboxProvider` and lands its webhook on the same
// two verbs: start a checkout, then confirm it paid.

export type FiatSession = {
	id: string;
	requestId: string;
	amountBaseUnits: string;
	status: "pending" | "paid";
};

export type FiatProvider = {
	readonly name: string;
	readonly sandbox: boolean;
	start(input: {
		requestId: string;
		amountBaseUnits: string;
	}): Promise<FiatSession>;
	confirm(session: FiatSession): Promise<boolean>;
};

// ponytail: in-memory sessions, reset on restart. A session is single-use and
// scoped to one request row, so losing the map loses a checkout, never money.
const sessions = new Map<string, FiatSession>();

export const sandboxProvider: FiatProvider = {
	name: "sandbox",
	sandbox: true,
	async start({ requestId, amountBaseUnits }) {
		const id = `fs_${requestId}_${Date.now().toString(36)}`;
		const session: FiatSession = {
			id,
			requestId,
			amountBaseUnits,
			status: "pending",
		};
		sessions.set(id, session);
		return session;
	},
	// There is no processor to ask, so the sandbox confirms on the caller's say
	// so. What bounds the damage is the settle endpoint: it only ever pays the
	// amount and recipient recorded on the request row, never the caller's.
	async confirm(session) {
		return sessions.has(session.id);
	},
};

export function fiatSession(id: string): FiatSession | undefined {
	return sessions.get(id);
}

export function markSessionPaid(id: string): void {
	const session = sessions.get(id);
	if (session) sessions.set(id, { ...session, status: "paid" });
}
