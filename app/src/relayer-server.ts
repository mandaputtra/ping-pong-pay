import type { ServerResponse } from "node:http";
import { createServer } from "node:http";
import { parseAddressBody } from "./lib/address.ts";
import { TOPUP_AMOUNT, relayerAccount, topUp } from "./lib/relayer.ts";

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

	if (req.method !== "POST" || req.url !== "/topup")
		return reply(res, 404, { error: "not found" });

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
