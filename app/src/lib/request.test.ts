import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import { describe, expect, it } from "vitest";
import { parseAmount, usdFromBaseUnits } from "./amount";
import {
	buildRequest,
	decodeLink,
	displayFieldsFrom,
	encodeLink,
	signRequest,
	verifyRequest,
} from "./request";

const ALICE = privateKeyToAccount(
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
);
const MALLORY = privateKeyToAccount(
	"0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
);
// The app signs through a browser provider; the test signs locally with the same
// viem client shape, so the typed data is byte-identical either way.
const signerFor = (account: typeof ALICE) =>
	createWalletClient({ account, chain: monadTestnet, transport: http() });
const TOKEN = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const NOW = 1_760_000_000;
const ORIGIN = "https://pingpongpay.fun";

describe("parseAmount", () => {
	it("accepts dollars up to two decimals and converts to base units", () => {
		expect(parseAmount("5")).toEqual({
			ok: true,
			baseUnits: "5000000",
			dollars: "5.00",
		});
		expect(parseAmount("12.5")).toMatchObject({ baseUnits: "12500000" });
		expect(parseAmount("0.07")).toMatchObject({ baseUnits: "70000" });
	});

	it("rejects what would change the money or confuse the payer", () => {
		// A third decimal would silently round; scientific notation and separators
		// are the shapes a payer would misread as a different amount.
		expect(parseAmount("1.234")).toMatchObject({ ok: false });
		expect(parseAmount("-5")).toMatchObject({ ok: false });
		expect(parseAmount("0")).toMatchObject({ ok: false });
		expect(parseAmount("")).toMatchObject({ ok: false });
		expect(parseAmount("abc")).toMatchObject({ ok: false });
		expect(parseAmount("1e5")).toMatchObject({ ok: false });
		expect(parseAmount("5000.01")).toMatchObject({ ok: false });
	});

	it("always reports dollars with two decimals for display", () => {
		expect(usdFromBaseUnits("5000000")).toBe("$5.00");
		expect(usdFromBaseUnits("70000")).toBe("$0.07");
		expect(usdFromBaseUnits("100000000")).toBe("$100.00");
	});
});

describe("payment request signature", () => {
	const request = buildRequest(
		ALICE.address,
		TOKEN,
		"2500000",
		"Logo",
		"",
		NOW,
	);

	it("round-trips the signed request through the link", async () => {
		const signature = await signRequest(signerFor(ALICE), ALICE, request);
		const link = encodeLink(request, signature, ORIGIN);
		expect(link.startsWith(`${ORIGIN}/pay/`)).toBe(true);
		const decoded = decodeLink(new URL(link).pathname.split("/pay/")[1]);
		expect(decoded).not.toBeNull();
		expect(decoded?.recipient).toBe(ALICE.address);
		expect(decoded?.token).toBe(TOKEN);
		expect(decoded?.amount).toBe("2500000");
		expect(decoded?.expiry).toBe(request.expiry);
		expect(await verifyRequest(decoded!, signature)).toBe(true);
	});

	it("rejects a tampered amount in the link", async () => {
		const signature = await signRequest(signerFor(ALICE), ALICE, request);
		const decoded = decodeLink(
			new URL(encodeLink(request, signature, ORIGIN)).pathname.split(
				"/pay/",
			)[1],
		)!;
		// The attacker edits the amount they will pay; the signature still covers
		// the original, so verification must fail rather than redirect the money.
		expect(
			await verifyRequest({ ...decoded, amount: "250000000" }, signature),
		).toBe(false);
	});

	it("rejects a tampered recipient in the link", async () => {
		const signature = await signRequest(signerFor(ALICE), ALICE, request);
		const decoded = decodeLink(
			new URL(encodeLink(request, signature, ORIGIN)).pathname.split(
				"/pay/",
			)[1],
		)!;
		expect(
			await verifyRequest(
				{ ...decoded, recipient: MALLORY.address },
				signature,
			),
		).toBe(false);
	});

	it("rejects a signature from anyone but the recipient", async () => {
		expect(
			await verifyRequest(
				request,
				await signRequest(signerFor(MALLORY), MALLORY, request),
			),
		).toBe(false);
		expect(await verifyRequest(request, "0xdeadbeef")).toBe(false);
	});

	it("gives each request a unique nonce and a bounded expiry", () => {
		const a = buildRequest(ALICE.address, TOKEN, "1000000", "", "", NOW);
		const b = buildRequest(ALICE.address, TOKEN, "1000000", "", "", NOW + 1);
		expect(a.nonce).not.toBe(b.nonce);
		expect(Number(b.expiry) - Number(b.nonce)).toBe(60 * 60 * 24 * 7);
		expect(Number(a.expiry)).toBeGreaterThan(Number(a.nonce));
	});

	it("returns null for a link that is not a request", () => {
		expect(decodeLink("not-hex")).toBeNull();
		expect(decodeLink("0xdeadbeef")).toBeNull();
	});
});

describe("requester name transport", () => {
	const request = buildRequest(
		ALICE.address,
		TOKEN,
		"2500000",
		"Logo",
		"Sarah",
		NOW,
	);

	it("carries the name in the URL so the payer sees who is asking", async () => {
		const signature = await signRequest(signerFor(ALICE), ALICE, request);
		const link = encodeLink(request, signature, ORIGIN);
		const query = link.slice(link.indexOf("?"));
		expect(new URLSearchParams(query).get("from")).toBe("Sarah");
	});

	it("does not let a swapped name affect verification", async () => {
		const signature = await signRequest(signerFor(ALICE), ALICE, request);
		const decoded = decodeLink(
			new URL(encodeLink(request, signature, ORIGIN)).pathname.split(
				"/pay/",
			)[1],
		)!;
		// The name is display-only. Renaming the requester in the URL must not
		// change whether the payment terms verify, and must not be signed over.
		expect(await verifyRequest(decoded, signature)).toBe(true);
		expect(
			await verifyRequest(
				{ ...decoded, requesterName: "Someone else" },
				signature,
			),
		).toBe(true);
	});

	it("reads the name back out of a pay URL's query", () => {
		expect(displayFieldsFrom({ d: "Logo", from: "Sarah" })).toEqual({
			description: "Logo",
			requesterName: "Sarah",
		});
		expect(displayFieldsFrom({})).toEqual({
			description: "",
			requesterName: "",
		});
	});
});
