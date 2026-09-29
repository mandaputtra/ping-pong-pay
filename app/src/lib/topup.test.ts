import { describe, expect, it } from "vitest";
import { friendlyError } from "./topup";

// Acceptance criterion 3: no raw provider/chain error ever reaches the user.
describe("friendlyError", () => {
	it("maps each failure class to its own line with an action", () => {
		expect(friendlyError(new Error("out of stock"))).toMatch(
			/out of demo money/i,
		);
		expect(friendlyError(new Error("fetch failed"))).toMatch(/connection/i);
		expect(friendlyError(new Error("TOPUP_FAILED"))).toBe(
			"That didn't go through. Try again.",
		);
		expect(friendlyError("a thrown string")).toBe(
			"That didn't go through. Try again.",
		);
	});

	it("never leaks a raw error code", () => {
		expect(
			friendlyError(new Error("execution reverted: InsufficientFunds")),
		).not.toMatch(/revert|InsufficientFunds/i);
	});
});
