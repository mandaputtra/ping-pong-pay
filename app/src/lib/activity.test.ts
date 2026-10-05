import { describe, expect, it } from "vitest";
import {
	type ActivityEntry,
	applyNotes,
	loadEntries,
	loadNotes,
	mergeEntries,
	saveEntries,
	saveNote,
} from "./activity";

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

const entry = (over: Partial<ActivityEntry> = {}): ActivityEntry => ({
	id: "0xabc:3",
	hash: "0xabc",
	amount: "2500000",
	counterparty: "0x777C742eFd1ceE02Dd791DfCda9d3199EE5FE58C",
	timestamp: 1_760_000_000,
	description: "",
	...over,
});

describe("mergeEntries", () => {
	it("deduplicates by transfer identity, so a re-scan cannot double-count", () => {
		const stored = [entry()];
		// The same transfer seen again in an overlapping block range.
		const rescanned = mergeEntries(stored, [entry()]);
		expect(rescanned).toHaveLength(1);
		expect(rescanned[0].id).toBe("0xabc:3");
	});

	it("treats two transfers in the same transaction as two entries", () => {
		const merged = mergeEntries(
			[entry({ id: "0xabc:3" })],
			[entry({ id: "0xabc:7", hash: "0xabc" })],
		);
		expect(merged.map((e) => e.id).sort()).toEqual(["0xabc:3", "0xabc:7"]);
	});

	it("treats an identical amount from the same payer as two separate payments", () => {
		const merged = mergeEntries(
			[entry({ id: "0xaaa:0" })],
			[entry({ id: "0xbbb:0", hash: "0xbbb" })],
		);
		expect(merged).toHaveLength(2);
	});

	it("keeps newest first", () => {
		const merged = mergeEntries(
			[entry({ id: "old", timestamp: 100 })],
			[entry({ id: "new", timestamp: 200 })],
		);
		expect(merged[0].id).toBe("new");
	});
});

describe("persistence", () => {
	it("survives a reload", () => {
		const storage = fakeStorage();
		saveEntries([entry()], storage);
		expect(loadEntries(storage)).toHaveLength(1);
		// A reload re-reads the same storage; nothing else carries the list.
		expect(loadEntries(storage)[0].hash).toBe("0xabc");
	});

	it("returns an empty list rather than throwing on corrupt storage", () => {
		const storage = fakeStorage();
		storage.setItem("ppp:activity", "{not json");
		expect(loadEntries(storage)).toEqual([]);
	});
});

describe("descriptions", () => {
	it("matches a note by amount and counterparty", () => {
		const storage = fakeStorage();
		saveNote(
			"2500000",
			"0x777C742eFd1ceE02Dd791DfCda9d3199EE5FE58C",
			"Logo",
			storage,
		);
		const [withNote] = applyNotes([entry()], storage);
		expect(withNote.description).toBe("Logo");
	});

	it("leaves an unmatched payment blank rather than guessing", () => {
		const storage = fakeStorage();
		saveNote(
			"9990000",
			"0x777C742eFd1ceE02Dd791DfCda9d3199EE5FE58C",
			"Other",
			storage,
		);
		const [unmatched] = applyNotes([entry()], storage);
		expect(unmatched.description).toBe("");
	});

	it("stores nothing for an empty description", () => {
		const storage = fakeStorage();
		saveNote(
			"2500000",
			"0x777C742eFd1ceE02Dd791DfCda9d3199EE5FE58C",
			"",
			storage,
		);
		expect(loadNotes(storage)).toHaveLength(0);
	});

	it("does not match a note to the wrong amount", () => {
		const storage = fakeStorage();
		saveNote(
			"1000000",
			"0x777C742eFd1ceE02Dd791DfCda9d3199EE5FE58C",
			"Deposit",
			storage,
		);
		const [payment] = applyNotes([entry({ amount: "2500000" })], storage);
		expect(payment.description).toBe("");
	});
});
