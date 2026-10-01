// The relayer is a separate service holding the hot wallet. It is NOT an in-process
// route: TanStack Start 1.168.59 has no server-route API (the documented
// `server: { handlers }` option lands in an unreleased version), so the boundary
// stays an explicit HTTP hop with CORS.
const RELAYER_URL = import.meta.env.VITE_RELAYER_URL ?? "http://localhost:8791";

export async function topUp(address: string): Promise<string> {
	const res = await fetch(`${RELAYER_URL}/topup`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ address }),
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.error ?? "TOPUP_FAILED");
	return body.hash as string;
}

// Every failure class gets its own plain-language line with an action.
// Copy deck from docs/ux-patterns.md §5.
export function friendlyError(err: unknown): string {
	const message = err instanceof Error ? err.message : String(err);
	if (/cap reached/i.test(message))
		return "You've already added money three times. That's plenty for now.";
	if (/out of stock/i.test(message))
		return "We're out of demo money right now. Try again in a bit.";
	if (/fetch failed|network|ECONN|CORS/i.test(message))
		return "Couldn't reach us. Check your connection and try again.";
	return "That didn't go through. Try again.";
}
