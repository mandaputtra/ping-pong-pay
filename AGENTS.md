# AGENTS.md — ping-pong-pay

## What this is
Easy dollar payments on Monad (Metropolis hackathon). Mera passkey wallet, AUSD only, offchain EIP-712 invoices + direct transfers, no custom contracts. Glossary: `CONTEXT.md`. Decisions: `docs/adr/`. Research: `docs/`.

## App layout
- `app/` — Vite + TS + viem + `@category-labs/mera` web app. `src/wallet.ts` (passkey connect, AUSD balance), `src/main.ts` (UI wiring), `src/*.test.ts` (vitest).
- Run from repo root with `--prefix app`: `npm run --prefix app dev|build|test|typecheck`.

## Monad gotchas (from docs/monad-metropolis.md)
- Testnet chain 10143, mainnet 143. AUSD testnet `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`.
- Monad charges declared `gasLimit` — always pass explicit `gas`, never estimates.
- Mera needs HTTPS or localhost + PRF-capable authenticator.

## Rules
- No blockchain jargon in user-facing copy (amounts in dollars).
- Invoice struct `{to, amount, nonce, expiry}` — amount/token/recipient inside signed data, never unsigned URL params.
- `session.end()` on sign-out/idle; prompt-per-transaction for large amounts.
- Keep diffs minimal; no new deps without asking.
