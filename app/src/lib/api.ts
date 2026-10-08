import type { Address } from "viem";
import { relayerBaseUrl } from "./topup";

// Thin client for the relayer's /api surface: short ULID links, users, and
// transaction history. Every call degrades to null on any failure — the pay
// screen keeps its self-describing blob and localStorage behaviour when there
// is no database, so API downtime never strands a payer.

const API = relayerBaseUrl(import.meta.env.VITE_RELAYER_URL);

async function get<T>(path: string): Promise<T | null> {
	try {
		const res = await fetch(`${API}${path}`);
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
	try {
		const res = await fetch(`${API}${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export type ApiUser = {
	address: string;
	email: string;
	short_name: string;
};

export type ApiRequest = {
	id: string;
	requester_address: string;
	recipient: string;
	token: string;
	amount: string;
	nonce: string;
	expiry: string;
	signature: string;
	description: string;
	requester_name: string;
	paid: boolean;
	paid_at: string | null;
	paid_hash: string | null;
	created_at: string;
};

export function fetchUser(address: string): Promise<{ user: ApiUser | null } | null> {
	return get(`/api/me?address=${address}`);
}

export function saveUser(
	address: Address,
	email: string,
	shortName: string,
): Promise<{ user: ApiUser } | null> {
	return post("/api/me", { address, email, shortName });
}

export function saveShortName(
	address: Address,
	shortName: string,
): Promise<{ user: ApiUser } | null> {
	return post("/api/name", { address, shortName });
}

export function fileRequest(row: {
	requesterAddress: Address;
	recipient: string;
	token: string;
	amount: string;
	nonce: string;
	expiry: string;
	signature: string;
	description: string;
	requesterName: string;
}): Promise<{ id: string } | null> {
	return post("/api/requests", row);
}

export function fetchRequest(id: string): Promise<{ request: ApiRequest } | null> {
	return get(`/api/requests/${id}`);
}

export function fetchHistory(
	requester: string,
): Promise<{ requests: ApiRequest[] } | null> {
	return get(`/api/requests?requester=${requester}`);
}

export function markPaid(id: string, hash: string): Promise<{ ok: true } | null> {
	return post(`/api/requests/${id}/paid`, { hash });
}
