import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { parseAddressBody } from "./address.ts";
import { topUp, TOPUP_AMOUNT } from "./relayer.ts";

const PORT = Number(process.env.PORT ?? 8787);

// The app is served from a different origin (Vite dev / static host), so the
// browser preflights this POST. Without these headers the click never leaves the page.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
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
  if (req.method !== "POST" || req.url !== "/topup") return reply(res, 404, { error: "not found" });

  let raw = "";
  for await (const chunk of req) raw += chunk;

  const address = parseAddressBody(raw);
  if (!address) return reply(res, 400, { error: "bad address" });

  try {
    const hash = await topUp(address);
    reply(res, 200, { hash, amount: TOPUP_AMOUNT.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CAP_REACHED") return reply(res, 429, { error: "cap reached" });
    if (message === "CEILING_REACHED") return reply(res, 503, { error: "out of stock" });
    // Our own hot wallet is dry. Say so, so the user isn't told to retry forever.
    if (/insufficient|balance|gas required|exceeds/i.test(message))
      return reply(res, 503, { error: "out of stock" });
    console.error("topup failed:", message);
    reply(res, 502, { error: "topup failed" });
  }
});

server.listen(PORT, () => console.log(`relayer listening on :${PORT}`));
