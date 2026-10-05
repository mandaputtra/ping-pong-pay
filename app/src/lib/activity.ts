import {
	type Address,
	createPublicClient,
	type Hex,
	http,
	parseAbi,
} from "viem";
import { monadTestnet } from "viem/chains";
import { USDC_TESTNET } from "./wallet";

const TRANSFER_EVENT = parseAbi([
	"event Transfer(address indexed from, address indexed to, uint256 value)",
])[0];

// The public Monad RPC refuses any eth_getLogs range wider than ~100 blocks
// (verified: 100 OK, 120 errors) and Monad produces a block every ~0.3s. So a
// history backfill is impossible over public RPC: at most ~30 seconds per call.
//
// That forces the shape: the activity list is incremental from a stored
// checkpoint, never a deep query. ponytail: 90 blocks keeps a safety margin
// under the RPC's limit. Per-block polling plus a server-side indexer is the
// upgrade if real history is ever needed.
const SCAN_CHUNK_BLOCKS = 90n;

const CHECKPOINT_KEY = "ppp:scan-checkpoints";
const NOTES_KEY = "ppp:notes";
const LIST_KEY = "ppp:activity";

const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(),
});

export type ActivityEntry = {
	// tx hash + log index is the transfer's identity on chain. The same transfer
	// can never emit two logs with the same index, so this is the dedup key: a
	// re-scan of an overlapping range cannot double-count.
	id: string;
	hash: Hex;
	amount: string; // base units
	counterparty: Address;
	timestamp: number; // unix seconds, from the block
	description: string;
};

export type Note = {
	amount: string;
	counterparty: Address;
	text: string;
};

function readJson<T>(key: string, store: Storage, fallback: T): T {
	try {
		const parsed: unknown = JSON.parse(store.getItem(key) ?? "");
		return (parsed ?? fallback) as T;
	} catch {
		return fallback;
	}
}

// --- persisted state ------------------------------------------------------

export function loadEntries(store: Storage = localStorage): ActivityEntry[] {
	return readJson<ActivityEntry[]>(LIST_KEY, store, []);
}

export function saveEntries(
	entries: ActivityEntry[],
	store: Storage = localStorage,
): void {
	try {
		store.setItem(LIST_KEY, JSON.stringify(entries));
	} catch {
		// Losing the cache only costs a rescan, never a wrong balance.
	}
}

// Merges freshly scanned entries into the stored list, keyed by id. Scanning the
// same block twice therefore yields the same list.
export function mergeEntries(
	stored: ActivityEntry[],
	fresh: ActivityEntry[],
): ActivityEntry[] {
	const byId = new Map(stored.map((e) => [e.id, e]));
	for (const entry of fresh)
		byId.set(entry.id, { ...byId.get(entry.id), ...entry });
	return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
}

export function loadNotes(store: Storage = localStorage): Note[] {
	return readJson<Note[]>(NOTES_KEY, store, []);
}

// The description is unsigned prose that never reaches the chain, so it is kept
// in the browser that created the link and matched back by amount + counterparty.
export function saveNote(
	amount: string,
	counterparty: Address,
	text: string,
	store: Storage = localStorage,
): void {
	if (!text) return;
	try {
		const list = loadNotes(store);
		list.push({ amount, counterparty, text });
		store.setItem(NOTES_KEY, JSON.stringify(list));
	} catch {
		// A description is a nicety; never let it block anything.
	}
}

function checkpointFor(address: Address, store: Storage): bigint | null {
	const raw = readJson<Record<string, string>>(CHECKPOINT_KEY, store, {})[
		address.toLowerCase()
	];
	return raw === undefined ? null : BigInt(raw);
}

function saveCheckpoint(
	address: Address,
	blockNumber: bigint,
	store: Storage,
): void {
	try {
		const all = readJson<Record<string, string>>(CHECKPOINT_KEY, store, {});
		all[address.toLowerCase()] = blockNumber.toString();
		store.setItem(CHECKPOINT_KEY, JSON.stringify(all));
	} catch {
		// Same deal: a lost checkpoint costs a rescan.
	}
}

// --- scanning -------------------------------------------------------------

// Reads USDC transfers into `address` since the stored checkpoint. Returns the
// raw transfers plus the block height reached, so the caller can cache them.
export async function scanIncoming(
	address: Address,
	store: Storage = localStorage,
): Promise<{ entries: ActivityEntry[]; scannedTo: bigint }> {
	const latest = await publicClient.getBlockNumber();
	const stored = checkpointFor(address, store);
	// First run: start a chunk back rather than at genesis - the RPC will not give
	// us more than one chunk anyway.
	const from =
		stored ?? (latest > SCAN_CHUNK_BLOCKS ? latest - SCAN_CHUNK_BLOCKS : 0n);

	if (from >= latest) {
		return { entries: [], scannedTo: latest };
	}

	const logs = await publicClient.getLogs({
		address: USDC_TESTNET,
		event: TRANSFER_EVENT,
		args: { to: address },
		fromBlock: from,
		toBlock: latest,
	});

	// One block fetch covers the whole chunk: a 90-block window is ~27 seconds, so
	// per-log block lookups would be 90 round trips for no accuracy anyone can see.
	const block = await publicClient.getBlock({ blockNumber: latest });

	const entries = logs.flatMap((log) =>
		// Narrowing guard: a log with an unrecognised shape is skipped rather than
		// crashing the whole scan and losing the entries that did parse.
		log.args.value === undefined || log.args.from === undefined
			? []
			: [
					{
						id: `${log.transactionHash}:${log.logIndex}`,
						hash: log.transactionHash,
						amount: log.args.value.toString(),
						counterparty: log.args.from,
						timestamp: Number(block.timestamp),
						description: "",
					},
				],
	);

	saveCheckpoint(address, latest, store);
	return { entries, scannedTo: latest };
}

// Fills in descriptions for entries the creator's browser still knows about.
export function applyNotes(
	entries: ActivityEntry[],
	store: Storage = localStorage,
): ActivityEntry[] {
	const notes = loadNotes(store);
	if (notes.length === 0) return entries;
	return entries.map((entry) => ({
		...entry,
		description:
			notes.find(
				(n) =>
					n.amount === entry.amount &&
					n.counterparty.toLowerCase() === entry.counterparty.toLowerCase(),
			)?.text ?? "",
	}));
}
