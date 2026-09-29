import type { Address } from "viem";
import { parseUnits } from "viem";

// Server decides the amount; the client never gets to choose.
export const TOPUP_AMOUNT = parseUnits("100", 6);

const PER_ADDRESS_CAP = parseUnits("200", 6);

// Addresses are free to generate, so the per-address cap alone is not an abuse
// limit. This is the ceiling on everything we have handed out so far.
const GLOBAL_CEILING = parseUnits("100000", 6);

// ponytail: in-memory ledger, resets on restart. Move to a real store before
// mainnet or if a single relayer is publicly reachable for more than a demo.
const reserved: Record<string, string> = {};

// Reserve synchronously, before any await, so two concurrent requests for the
// same address cannot both pass the check. Caller must release() on failure.
export function reserve(address: Address): bigint {
	const prior = BigInt(reserved[address] ?? "0");
	const next = prior + TOPUP_AMOUNT;
	if (next > PER_ADDRESS_CAP) throw new Error("CAP_REACHED");

	const outstanding = Object.values(reserved).reduce(
		(sum, v) => sum + BigInt(v),
		0n,
	);
	if (outstanding + TOPUP_AMOUNT > GLOBAL_CEILING)
		throw new Error("CEILING_REACHED");

	reserved[address] = next.toString();
	return prior;
}

export function release(address: Address, prior: bigint): void {
	reserved[address] = prior.toString();
}
