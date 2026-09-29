import { describe, expect, it } from "vitest";
import { parseAddressBody } from "./address";
import { release, reserve } from "./cap";

describe("parseAddressBody", () => {
	it("accepts a real address and checksums it", () => {
		expect(
			parseAddressBody(
				'{"address":"0x000000000000000000000000000000000000dead"}',
			),
		).toBe("0x000000000000000000000000000000000000dEaD");
	});

	it("rejects everything it must not act on", () => {
		expect(parseAddressBody('{"address":"nope"}')).toBeNull();
		expect(parseAddressBody("{}")).toBeNull();
		expect(parseAddressBody("null")).toBeNull();
		expect(parseAddressBody("not json")).toBeNull();
		expect(parseAddressBody('{"address":"0x1234"}')).toBeNull();
		expect(parseAddressBody(`{"pad":"${"a".repeat(5000)}"}`)).toBeNull();
	});
});

describe("cap ledger", () => {
	const a = "0x000000000000000000000000000000000000dEaD" as const;
	const b = "0x000000000000000000000000000000000000bEef" as const;

	it("allows two top-ups then refuses the third for the same address", () => {
		const prior = reserve(a);
		expect(() => reserve(a)).not.toThrow();
		expect(() => reserve(a)).toThrow("CAP_REACHED");
		release(a, prior); // reset for the other assertions
		release(a, BigInt("100000000") * 1n);
	});

	it("gives each address its own allowance", () => {
		const prior = reserve(b);
		expect(() => reserve(b)).not.toThrow();
		release(b, prior);
		release(b, prior);
	});
});
