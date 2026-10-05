import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The AC here is a promise to judges: no screen may imply real funds reached a
// bank. That promise is only worth anything if it cannot be edited away silently,
// so it is asserted against the component source rather than trusted to review.
const source = readFileSync(
	new URL("../components/Withdraw.tsx", import.meta.url),
	"utf8",
);

describe("cash-out screen is visibly a simulation", () => {
	it("labels the screen itself as simulated", () => {
		expect(source).toMatch(/Simulated/);
	});

	it("says no bank is connected in the form state", () => {
		expect(source).toMatch(/not connected/i);
		expect(source).toMatch(/no bank is connected/i);
	});

	it("says nothing was sent in the confirmation state", () => {
		expect(source).toMatch(/Nothing was sent to a bank/i);
		expect(source).toMatch(/balance is\s*unchanged/i);
	});

	it("makes no request to any server or off-ramp", () => {
		// The whole point: no fetch, no submit, no network call of any kind.
		expect(source).not.toMatch(/fetch\(|XMLHttpRequest|axios/);
		expect(source).not.toMatch(/api\.|https?:\/\/(?!localhost)/);
	});
});
