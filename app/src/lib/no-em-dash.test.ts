import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// An em-dash in product copy is the signature LLM stylistic tell: it reads as a
// design flourish rather than punctuation, and on a payment screen it is the
// difference between copy a person wrote and copy a model produced. Banned
// outright, no frequency allowance.

const SRC = new URL("..", import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
	});
}

describe("no em-dashes in shipped copy", () => {
	const files = sourceFiles(SRC);

	it("finds the files to check", () => {
		expect(files.length).toBeGreaterThan(5);
	});

	it("has zero em-dashes and zero en-dashes in component and copy source", () => {
		const offenders: string[] = [];
		for (const file of files) {
			const source = readFileSync(file, "utf8");
			const lines = source.split("\n");
			lines.forEach((line, i) => {
				// Comments are stripped first: a dash in a code comment is not copy.
				const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
				if (/[—–]/.test(code)) {
					offenders.push(`${file.split("/").pop()}:${i + 1} ${line.trim()}`);
				}
			});
		}
		expect(offenders).toEqual([]);
	});
});
