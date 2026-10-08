import type { Address } from "viem";
import postgres from "postgres";

// One lazy connection: the relayer is a single long-lived process, so the
// pool lives for its lifetime. DATABASE_URL is a Fly secret in production and
// the compose connection string locally.
let sql: ReturnType<typeof postgres> | null = null;

export function db(): ReturnType<typeof postgres> | null {
	const url = process.env.DATABASE_URL;
	if (!url) return null;
	sql ??= postgres(url, { max: 4, idle_timeout: 20 });
	return sql;
}

export type DbUser = {
	address: string;
	email: string;
	short_name: string;
};

export type DbRequest = {
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

export async function upsertUser(
	address: Address,
	email = "",
	shortName = "",
): Promise<DbUser> {
	const rows = await db()!`
    INSERT INTO users (address, email, short_name)
    VALUES (${address}, ${email}, ${shortName})
    ON CONFLICT (address) DO UPDATE SET
      email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE users.email END,
      short_name = CASE WHEN EXCLUDED.short_name <> '' THEN EXCLUDED.short_name ELSE users.short_name END,
      updated_at = now()
    RETURNING address, email, short_name
  `;
	return rows[0] as DbUser;
}

export async function getUser(address: string): Promise<DbUser | null> {
	const rows = await db()!`
    SELECT address, email, short_name FROM users WHERE address = ${address}
  `;
	return (rows[0] as DbUser | undefined) ?? null;
}

export async function setShortName(
	address: Address,
	shortName: string,
): Promise<DbUser> {
	const rows = await db()!`
    INSERT INTO users (address, short_name)
    VALUES (${address}, ${shortName})
    ON CONFLICT (address) DO UPDATE SET short_name = EXCLUDED.short_name, updated_at = now()
    RETURNING address, email, short_name
  `;
	return rows[0] as DbUser;
}

export async function createRequest(row: {
	id: string;
	requesterAddress: Address;
	recipient: string;
	token: string;
	amount: string;
	nonce: string;
	expiry: string;
	signature: string;
	description: string;
	requesterName: string;
}): Promise<DbRequest> {
	const rows = await db()!`
    INSERT INTO requests (id, requester_address, recipient, token, amount, nonce, expiry, signature, description, requester_name)
    VALUES (${row.id}, ${row.requesterAddress}, ${row.recipient}, ${row.token}, ${row.amount}, ${row.nonce}, ${row.expiry}, ${row.signature}, ${row.description}, ${row.requesterName})
    RETURNING *
  `;
	return rows[0] as DbRequest;
}

export async function getRequest(id: string): Promise<DbRequest | null> {
	const rows = await db()!`
    SELECT * FROM requests WHERE id = ${id}
  `;
	return (rows[0] as DbRequest | undefined) ?? null;
}

export async function markRequestPaid(
	id: string,
	hash: string,
): Promise<DbRequest | null> {
	const rows = await db()!`
    UPDATE requests SET paid = TRUE, paid_at = now(), paid_hash = ${hash}
    WHERE id = ${id} AND paid = FALSE
    RETURNING *
  `;
	return (rows[0] as DbRequest | undefined) ?? null;
}

export async function listRequests(
	requesterAddress: string,
): Promise<DbRequest[]> {
	const rows = await db()!`
    SELECT * FROM requests WHERE requester_address = ${requesterAddress}
    ORDER BY created_at DESC LIMIT 50
  `;
	return rows as unknown as DbRequest[];
}
