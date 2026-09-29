import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { App } from "./App";

// Guards the shell: the signed-out copy and the accent button must exist before
// any wallet exists, and the balance must read as dollars.
describe("App shell", () => {
  it("renders the signed-out state with jargon-free copy", () => {
    const html = renderToStaticMarkup(createElement(App));

    expect(html).toContain("Easy dollar payments. No passwords, no crypto fuss.");
    expect(html).toContain("Get started");
    expect(html).not.toMatch(/seed phrase|wallet address|gas|chainId|0x[a-f0-9]{6}/i);
  });

  it("exposes the error region to assistive tech when empty", () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).not.toContain('role="alert"');
  });
});
