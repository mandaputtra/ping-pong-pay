import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PingPongPay } from "./PingPongPay";

// Guards the shell: the signed-out copy and the primary action must exist before any
// wallet does, and the marketing surface must stay free of jargon.
describe("PingPongPay shell", () => {
	it("renders the signed-out state with jargon-free copy", () => {
		const html = renderToStaticMarkup(createElement(PingPongPay));

		expect(html).toContain(
			"Easy dollar payments. No passwords, no crypto fuss.",
		);
		expect(html).toContain("Get started");
		expect(html).not.toMatch(
			/seed phrase|wallet address|gas|chainId|0x[a-f0-9]{6}/i,
		);
	});
});
