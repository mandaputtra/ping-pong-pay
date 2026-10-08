-- Ping Pong Pay schema. Two tables, no migrations framework: this file is the
-- whole schema and re-runs cleanly, so both local compose and Fly Postgres
-- bootstrap from it directly.
--
-- Design notes:
-- - The payer never trusts the row: recipient/token/amount/nonce/expiry still
--   come from the signed blob in the URL and are verified in the browser. The
--   row is an index (short ULID link, history, paid marking), not a source of
--   payment truth. A tampered row cannot redirect money.
-- - users is keyed by wallet address, the only stable identity Privy gives us.
--   Email is display-only; the seeder targets it, never auth.
-- - Links that predate the DB keep working: /pay/$slug falls back to decoding
--   the slug itself when it is not a ULID row id.

CREATE TABLE IF NOT EXISTS users (
  address TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  short_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  requester_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expiry BIGINT NOT NULL,
  signature TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  requester_name TEXT NOT NULL DEFAULT '',
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  paid_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requests_requester_idx ON requests(requester_address, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_paid_idx ON requests(paid) WHERE paid = FALSE;
