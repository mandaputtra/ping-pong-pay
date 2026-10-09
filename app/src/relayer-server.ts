import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { ulid } from "ulid";
import type { Address } from "viem";
import { isAddress } from "viem";
import { parseAddressBody } from "./lib/address.ts";
import {
	createRequest,
	db,
	getRequest,
	getUser,
	listRequests,
	markRequestPaid,
	setShortName,
	upsertUser,
} from "./lib/db.ts";
import { fiatSession, markSessionPaid, sandboxProvider } from "./lib/fiat.ts";
import { payout, relayerAccount, TOPUP_AMOUNT, topUp } from "./lib/relayer.ts";

// RELAYER_PORT, not PORT: on Fly both processes share one container and PORT is
// already taken by the app. Falling back to PORT would crash on EADDRINUSE.
const PORT = Number(process.env.RELAYER_PORT ?? 8791);

// The app is served from a different origin, so the browser preflights this POST.
// ALLOWED_ORIGIN pins it to the app's own origin: "*" on a publicly reachable
// host would let any site on the internet spend this wallet's USDC, which is an
// open faucet rather than a demo. Unset locally stays "*", where the host is
// localhost and nothing else can reach it.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const CORS = {
	"access-control-allow-origin": ALLOWED_ORIGIN ?? "*",
	"access-control-allow-methods": "POST, OPTIONS",
	"access-control-allow-headers": "content-type",
	"access-control-max-age": "600",
};

function reply(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, { "content-type": "application/json", ...CORS });
	res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
	if (req.method === "OPTIONS") {
		res.writeHead(204, CORS);
		return res.end();
	}
	// A GET /health that only answers when the keys and the amount the server
	// will spend are in place. Fly's check hits this; anything under /topup
	// would spend or collide with the faucet's own validation errors.
	if (req.method === "GET" && req.url === "/health") {
		try {
			relayerAccount();
		} catch {
			return reply(res, 503, { error: "no key" });
		}
		return reply(res, 200, { ok: true, amount: TOPUP_AMOUNT.toString() });
	}

	if (req.method !== "POST" || req.url !== "/topup") return api(req, res);

	let raw = "";
	for await (const chunk of req) raw += chunk;

	const address = parseAddressBody(raw);
	if (!address) return reply(res, 400, { error: "bad address" });

	try {
		const hash = await topUp(address);
		reply(res, 200, { hash, amount: TOPUP_AMOUNT.toString() });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message === "CAP_REACHED")
			return reply(res, 429, { error: "cap reached" });
		if (message === "CEILING_REACHED")
			return reply(res, 503, { error: "out of stock" });
		if (/insufficient|balance|gas required|exceeds/i.test(message))
			return reply(res, 503, { error: "out of stock" });
		console.error("topup failed:", message);
		reply(res, 502, { error: "topup failed" });
	}
});

server.listen(PORT, () => console.log(`relayer listening on :${PORT}`));
async function readJson(
	req: IncomingMessage,
): Promise<Record<string, unknown>> {
	let raw = "";
	for await (const chunk of req) raw += chunk;
	try {
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

// Everything under /api is index data, never payment truth. The payer still
// verifies the signed blob in the URL; these rows only make links short,
// names sticky, and history real. Without DATABASE_URL every route answers
// 503 and the client keeps its localStorage behaviour, so local dev without a
// database is unaffected.
async function api(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const url = new URL(req.url ?? "/", "http://localhost");
	if (!db()) return reply(res, 503, { error: "no database" });

	if (req.method === "GET" && url.pathname === "/api/me") {
		const address = url.searchParams.get("address") ?? "";
		if (!isAddress(address)) return reply(res, 400, { error: "bad address" });
		return reply(res, 200, { user: await getUser(address) });
	}

	if (req.method === "POST" && url.pathname === "/api/me") {
		const body = await readJson(req);
		const address = typeof body.address === "string" ? body.address : "";
		if (!isAddress(address)) return reply(res, 400, { error: "bad address" });
		const email =
			typeof body.email === "string" ? body.email.slice(0, 160) : "";
		const shortName =
			typeof body.shortName === "string"
				? body.shortName.trim().slice(0, 40)
				: "";
		if (!shortName) return reply(res, 400, { error: "name required" });
		return reply(res, 200, {
			user: await upsertUser(address as Address, email, shortName),
		});
	}

	if (req.method === "POST" && url.pathname === "/api/requests") {
		const body = await readJson(req);
		const str = (v: unknown) => (typeof v === "string" ? v : "");
		const requester = str(body.requesterAddress);
		if (!isAddress(requester) || !isAddress(str(body.recipient)))
			return reply(res, 400, { error: "bad address" });
		if (!str(body.signature).startsWith("0x"))
			return reply(res, 400, { error: "bad signature" });
		// The row stores the requester's own signed blob verbatim. Verification
		// still happens in the browser against the URL; this endpoint never
		// invents payment terms, it only files them under a short id.
		await upsertUser(requester as Address);
		const row = await createRequest({
			id: ulid(),
			requesterAddress: requester as Address,
			recipient: str(body.recipient),
			token: str(body.token),
			amount: str(body.amount),
			nonce: str(body.nonce),
			expiry: str(body.expiry),
			signature: str(body.signature),
			description: str(body.description).slice(0, 280),
			requesterName: str(body.requesterName).slice(0, 40),
		});
		return reply(res, 200, { id: row.id });
	}

	if (req.method === "GET" && url.pathname.startsWith("/api/requests/")) {
		const id = url.pathname.slice("/api/requests/".length);
		if (!/^[0-9A-Z]{26}$/.test(id)) return reply(res, 400, { error: "bad id" });
		const row = await getRequest(id);
		if (!row) return reply(res, 404, { error: "not found" });
		return reply(res, 200, { request: row });
	}

	if (req.method === "GET" && url.pathname === "/api/requests") {
		const requester = url.searchParams.get("requester") ?? "";
		if (!isAddress(requester)) return reply(res, 400, { error: "bad address" });
		return reply(res, 200, { requests: await listRequests(requester) });
	}

	if (req.method === "POST" && url.pathname.endsWith("/paid")) {
		const id = url.pathname.slice("/api/requests/".length, -"/paid".length);
		if (!/^[0-9A-Z]{26}$/.test(id)) return reply(res, 400, { error: "bad id" });
		const body = await readJson(req);
		const hash = typeof body.hash === "string" ? body.hash : "";
		if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
			return reply(res, 400, { error: "bad hash" });
		const row = await markRequestPaid(id, hash);
		if (!row) return reply(res, 404, { error: "not found" });
		return reply(res, 200, { ok: true });
	}

	if (req.method === "POST" && url.pathname === "/api/name") {
		const body = await readJson(req);
		const address = typeof body.address === "string" ? body.address : "";
		const shortName =
			typeof body.shortName === "string"
				? body.shortName.trim().slice(0, 40)
				: "";
		if (!isAddress(address) || !shortName)
			return reply(res, 400, { error: "bad name" });
		return reply(res, 200, {
			user: await setShortName(address as Address, shortName),
		});
	}

	// Card leg (ADR-0002). checkout opens a session for a real request row;
	// settle pays that row's own recipient and amount from the float. The
	// caller never names a recipient, so the float cannot be drained elsewhere.
	if (req.method === "POST" && url.pathname === "/api/fiat/checkout") {
		const body = await readJson(req);
		const requestId = typeof body.requestId === "string" ? body.requestId : "";
		if (!/^[0-9A-Z]{26}$/.test(requestId))
			return reply(res, 400, { error: "bad id" });
		const row = await getRequest(requestId);
		if (!row) return reply(res, 404, { error: "not found" });
		if (row.paid) return reply(res, 409, { error: "already paid" });
		const session = await sandboxProvider.start({
			requestId,
			amountBaseUnits: row.amount,
		});
		return reply(res, 200, {
			session: { id: session.id, amount: row.amount },
			sandbox: sandboxProvider.sandbox,
		});
	}

	if (req.method === "POST" && url.pathname === "/api/fiat/settle") {
		const body = await readJson(req);
		const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
		const session = fiatSession(sessionId);
		if (!session) return reply(res, 404, { error: "no session" });
		if (session.status === "paid")
			return reply(res, 409, { error: "already paid" });
		if (!(await sandboxProvider.confirm(session)))
			return reply(res, 402, { error: "not paid" });
		const row = await getRequest(session.requestId);
		if (!row) return reply(res, 404, { error: "not found" });
		if (row.paid) return reply(res, 409, { error: "already paid" });
		try {
			const hash = await payout(row.recipient as Address, BigInt(row.amount));
			markSessionPaid(sessionId);
			await markRequestPaid(row.id, hash);
			return reply(res, 200, { hash });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (/insufficient|balance|gas required|exceeds/i.test(message))
				return reply(res, 503, { error: "out of stock" });
			console.error("fiat settle failed:", message);
			return reply(res, 502, { error: "payout failed" });
		}
	}

	return reply(res, 404, { error: "not found" });
}
