import { describe, expect, it } from "vitest";
import {
	decodeLink,
	encodeLink,
	encodeSignedBlob,
} from "./request";
import { USDC_TESTNET } from "./wallet";

describe("short and long links share one blob", () => {
	const request = {
		recipient: "0x70997970C51812dC3a010c7D01b50E0d319eE5fE" as `0x${string}`,
		token: USDC_TESTNET,
		amount: "2500000",
		nonce: "123",
		expiry: "9999999999",
		description: "Logo",
		requesterName: "Manda",
	};
	const signature =
		"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12" as const;

	it("round-trips the blob both transports share", () => {
		const blob = encodeSignedBlob({ ...request, signature });
		const decoded = decodeLink(blob);
		expect(decoded?.recipient).toBe(request.recipient);
		expect(decoded?.amount).toBe(request.amount);
		expect(decoded?.signature).toBe(signature);
	});

	it("the long link embeds exactly that blob", () => {
		const link = encodeLink(request, signature, "https://example.com");
		const slug = new URL(link).pathname.split("/pay/")[1];
		expect(slug).toBe(encodeSignedBlob({ ...request, signature }));
	});
});
