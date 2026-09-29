import { getAddress, isAddress } from "viem";
import type { Address } from "viem";

const MAX_BODY_BYTES = 4096;

// Trust boundary. Returns null for anything we will not act on: oversized bodies,
// malformed JSON, missing address, or an address that is not a real EVM address.
export function parseAddressBody(raw: string): Address | null {
  if (raw.length > MAX_BODY_BYTES) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || !("address" in parsed)) return null;
  const { address } = parsed;
  if (typeof address !== "string" || !isAddress(address)) return null;
  return getAddress(address);
}
