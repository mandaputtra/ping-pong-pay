import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import { describe, expect, it } from "vitest";
import { isExpired, markNonceUsed, refusalFor, usedNonces } from "./guards";
import { buildRequest, verifyRequest } from "./request";

const ALICE = privateKeyToAccount(
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
);
const TOKEN = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const NOW = 1_760_000_000;

const REQUEST_TYPES = {
	Request: [
		{ name: "recipient", type: "address" },
		{ name: "token", type: "address" },
		{ name: "amount", type: "uint256" },
		{ name: "nonce", type: "uint256" },
		{ name: "expiry", type: "uint256" },
	],
} as const;

const terms = (r: ReturnType<typeof buildRequest>) => ({
	recipient: r.recipient,
	token: r.token,
	amount: BigInt(r.amount),
	nonce: BigInt(r.nonce),
	expiry: BigInt(r.expiry),
});

// Signs with whatever domain it is handed, so a test can prove the domain in
// request.ts is what actually gates acceptance.
const signWith = (domain: { name: string; chainId: number }) =>
	createWalletClient({
		account: ALICE,
		chain: monadTestnet,
		transport: http(),
	}).signTypedData({
		account: ALICE,
		domain: { version: "1", ...domain },
		types: REQUEST_TYPES,
		primaryType: "Request",
		message: terms(buildRequest(ALICE.address, TOKEN, "1000000", "", "", NOW)),
	});

describe("expiry", () => {
	const request = buildRequest(ALICE.address, TOKEN, "1000000", "", "", NOW);

	it("allows payment before the expiry and refuses it at and after it", () => {
		expect(isExpired(request, NOW + 10)).toBe(false);
		expect(isExpired(request, Number(request.expiry) - 1)).toBe(false);
		expect(isExpired(request, Number(request.expiry))).toBe(true);
		expect(isExpired(request, Number(request.expiry) + 1)).toBe(true);
	});
});

describe("chain and domain binding", () => {
	const request = buildRequest(ALICE.address, TOKEN, "1000000", "", "", NOW);

	it("refuses a signature made for another chain", async () => {
		const foreign = await signWith({ name: "Ping Pong Pay", chainId: 1 });
		expect(await verifyRequest(request, foreign)).toBe(false);
	});

	it("refuses a signature made under another app's domain name", async () => {
		const foreign = await signWith({ name: "Some Other App", chainId: 10143 });
		expect(await verifyRequest(request, foreign)).toBe(false);
	});

	it("accepts the signature its own domain produces", async () => {
		const own = await signWith({ name: "Ping Pong Pay", chainId: 10143 });
		expect(await verifyRequest(request, own)).toBe(true);
	});
});

describe("refusal copy", () => {
	it("gives every refusal class a plain sentence and a next action", () => {
		for (const kind of [
			"unreadable",
			"bad-signature",
			"expired",
			"already-paid",
		] as const) {
			const copy = refusalFor(kind);
			expect(copy).not.toMatch(/[a-f0-9]{10,}|undefined|null|NaN|0x/);
		}
		expect(refusalFor("expired")).toMatch(/ask/i);
		expect(refusalFor("already-paid")).toMatch(/already paid/i);
		expect(refusalFor("bad-signature")).toMatch(/do not pay|don't pay/i);
		expect(refusalFor("unreadable")).toMatch(/ask/i);
	});
});

describe("used-nonce ledger", () => {
	// localStorage is what the real ledger uses; this stands in for it so the
	// reload case is the same code path rather than a mock.
	function fakeStorage(): Storage {
		const map = new Map<string, string>();
		return {
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => {
				map.set(k, v);
			},
			removeItem: (k: string) => {
				map.delete(k);
			},
			clear: () => map.clear(),
			key: () => null,
			length: 0,
		} as unknown as Storage;
	}

	it("refuses a nonce that has already been used", () => {
		const storage = fakeStorage();
		expect(usedNonces(storage).has("1760000000")).toBe(false);
		markNonceUsed("1760000000", storage);
		expect(usedNonces(storage).has("1760000000")).toBe(true);
	});

	it("survives a page reload, because the entry is persisted", () => {
		const storage = fakeStorage();
		markNonceUsed("1760000000", storage);
		expect(storage.getItem("ppp:used-nonces")).toContain("1760000000");
		// A reload constructs the reader again; the value comes back off storage.
		expect(usedNonces(storage).has("1760000000")).toBe(true);
	});

	it("keeps distinct nonces independent", () => {
		const storage = fakeStorage();
		markNonceUsed("1", storage);
		markNonceUsed("2", storage);
		expect(usedNonces(storage).has("3")).toBe(false);
		expect(usedNonces(storage).size).toBe(2);
	});

	it("treats corrupt stored JSON as no nonces rather than throwing", () => {
		const storage = fakeStorage();
		storage.setItem("ppp:used-nonces", "{not json");
		expect(usedNonces(storage).size).toBe(0);
	});
});
