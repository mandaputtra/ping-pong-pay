import { bytesToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { deriveEvmKey } from "./wallet";

// The one behavior that must never silently change: same passkey bytes -> same address.
// If derivation drifts, returning users lose their money.
describe("deriveEvmKey", () => {
	it("is deterministic per index and distinct across indexes", () => {
		const prf = new Uint8Array(32).fill(7);
		const a = privateKeyToAccount(bytesToHex(deriveEvmKey(prf))).address;
		const b = privateKeyToAccount(bytesToHex(deriveEvmKey(prf))).address;
		const other = privateKeyToAccount(bytesToHex(deriveEvmKey(prf, 1))).address;
		expect(a).toBe(b);
		expect(a).not.toBe(other);
	});
});
