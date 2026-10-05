// Production host for the TanStack Start SSR bundle.
//
// `vite preview` is a static file server: it serves dist/client and 404s every
// route, because SSR has to run dist/server/server.js. That is why `pnpm start`
// used to answer 404 for / and /pay/:slug - verified by running it, not guessed.
//
// The bundle exports a Web-standard fetch handler, so this only has to convert
// node:http <-> fetch. No server framework: this is one route and one static dir.
import { createServer } from "node:http";
import { Readable } from "node:stream";
import serverEntry from "./dist/server/server.js";

const PORT = Number(process.env.PORT ?? 3101);
const CLIENT_DIR = new URL("./dist/client/", import.meta.url).pathname;
const { readFile } = await import("node:fs/promises");

const MIME = {
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
	".json": "application/json",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

	// Hashed asset filenames, so they can be cached forever and skipped by SSR.
	if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
		const ext = url.pathname.slice(url.pathname.lastIndexOf("."));
		try {
			const body = await readFile(`${CLIENT_DIR}${url.pathname.slice(1)}`);
			res.writeHead(200, {
				"content-type": MIME[ext] ?? "application/octet-stream",
				"cache-control": "public, max-age=31536000, immutable",
			});
			return res.end(body);
		} catch {
			// Fall through to SSR: the router may still own this path.
		}
	}

	const origin = `http://${req.headers.host ?? "localhost"}`;
	const hasBody = req.method !== "GET" && req.method !== "HEAD";
	const response = await serverEntry.fetch(
		new Request(new URL(url.pathname + url.search, origin), {
			method: req.method,
			headers: /** @type {HeadersInit} */ (req.headers),
			body: hasBody ? Readable.toWeb(req) : undefined,
			duplex: hasBody ? "half" : undefined,
		}),
	);

	res.writeHead(response.status, Object.fromEntries(response.headers));
	if (!response.body) return res.end();
	Readable.fromWeb(/** @type {ReadableStream} */ (response.body)).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
	console.log(`app listening on :${PORT}`);
});