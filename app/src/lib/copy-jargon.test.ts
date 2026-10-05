import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// "No blockchain jargon in user-facing copy" is only true if something checks it.
// This walks the components and copy tables and asserts the words the deck's
// "never say" column forbids never reach a payer.

const SRC = new URL("..", import.meta.url).pathname;

// Words a payer must never read. "wallet" and "seed phrase" are deliberately
// absent: "Create your wallet to pay" and "No seed phrase" are the deck's own
// wording, and both reassure rather than inform.
const ALLOWED_NEGATED = /\bno seed phrase\b/gi;
const FORBIDDEN = [
	/\bgas\b/i,
	/\bnonce\b/i,
	/\bEIP-?712\b/i,
	/\bsignature verification\b/i,
	/\bcustodial\b/i,
	/\bescrow\b/i,
	/\bblockchain\b/i,
	/\bon-?chain\b/i,
	/\bprivate key\b/i,
	/\bmetamask\b/i,
	/\bsmart contract\b/i,
	/\bERC-?20\b/i,
	/\bgasless\b/i,
	/\brevert(ed)?\b/i,
	/\binvoice\b/i,
	/\bconfirmations?\b/i,
];

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
	});
}

describe("payer-facing copy is jargon-free", () => {
	const files = sourceFiles(SRC).filter(
		// lib/relayer.ts and the ABI/type declarations are server-side or
		// machine-read; nothing there is ever shown to a payer.
		(f) => !f.includes("/lib/relayer.ts"),
	);

	it("finds the user-facing files to check", () => {
		expect(files.length).toBeGreaterThan(5);
	});

	for (const pattern of FORBIDDEN) {
		it(`no rendered string matches ${pattern}`, () => {
			const offenders: string[] = [];
			for (const file of files) {
				const source = readFileSync(file, "utf8");
				// Only look at strings and JSX text, not identifiers or ABI types.
				const rendered = [
					...source.matchAll(/title:\s*"([^"]*)"/g),
					...source.matchAll(/body:\s*"([^"]*)"/g),
					...source.matchAll(/reason:\s*"([^"]*)"/g),
					...source.matchAll(/>\s*([A-Z][^<>{}]{6,})\s*</g),
				]
					.map((m) => m[1])
					.join("\n")
					.replaceAll(ALLOWED_NEGATED, "");
				if (pattern.test(rendered)) {
					offenders.push(
						`${file.split("/").pop()}: ${rendered.match(pattern)?.[0]}`,
					);
				}
			}
			expect(offenders).toEqual([]);
		});
	}
});
