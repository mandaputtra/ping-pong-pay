# Ping Pong Pay

**Approved. Paid.** Instant USDC payments for freelancers — send a link, your client pays,
the money is yours in about a second. Built for the Monad Metropolis hackathon
(Track 02, Consumer Products & Payments).

## How it works

1. Sign up with a social login, email, or Face ID — a wallet is created for you, no seed phrase.
2. Top up demo USDC with one click.
3. Create a payment request (amount + description) and share the link anywhere.
4. Your client opens the link, sees who is asking for how much and why, taps Pay, confirms once.
5. The balance updates live in dollars. Withdrawal is simulated in the demo.

No escrow contract holds money — payments move directly wallet to wallet. See
[`docs/getpaidnow-architecture.md`](docs/getpaidnow-architecture.md).

## Run it

Prerequisites: [pnpm](https://pnpm.io) 10+, Node 22+.

```bash
cp .env.example app/.env    # then fill in VITE_PRIVY_APP_ID and RELAYER_PRIVATE_KEY
cd app
pnpm install
pnpm dev                    # app on :3101
pnpm relayer                # top-up service on :8791 (needs RELAYER_PRIVATE_KEY)
```

Environment (`app/.env`; both Vite and the relayer read it from there):

| `VITE_PRIVY_APP_ID` | client | Privy project ID from [dashboard.privy.io](https://dashboard.privy.io) |
| `RELAYER_PRIVATE_KEY` | **server only** | Hot wallet funding demo top-ups. Never reaches the browser. |
| `VITE_RELAYER_URL` | client | Relayer base URL, defaults to `http://localhost:8791` |

Checks: `pnpm test` (unit tests) · `pnpm typecheck` · `pnpm check` (biome) · `pnpm build`
(SSR bundle, then `pnpm start` to serve it).

## Architecture

- **Stack:** TanStack Start (SSR) · Router · Query · Tailwind v4 · Privy embedded wallets · viem.
- **Token:** USDC on Monad testnet
  (`0x534b2f3A21130d7a60830c2Df862319e593943A3`).
- **Top-up:** server-side relayer, because Monad rejects zero-balance senders and the Agora
  faucet is drained — documented in [`docs/gas-for-new-wallets.md`](docs/gas-for-new-wallets.md).
  Per-address and global ceilings bound it.
- **Payment links:** off-chain signed invoice `{to, amount, nonce, expiry}`, verified with
  EIP-712 before any signing prompt. No payment contract (see
  [`docs/adr/0001-offchain-invoices-no-escrow.md`](docs/adr/0001-offchain-invoices-no-escrow.md)).

Key docs: [`AGENTS.md`](AGENTS.md) (stack, commands, gotchas) · [`CONTEXT.md`](CONTEXT.md)
(glossary) · [`docs/`](docs/) (research, pitch deck, hackathon terms).

## Hackathon disclosure

Per the Metropolis Terms & Conditions §4.1.4: **this project was built with AI coding tools**
— an AI assistant wrote code, ran tests, and authored docs under the author's direction, with
every change reviewed before commit.

- MIT License ([LICENSE](LICENSE)).
- Submission deadline 13 Oct 2026, 11:59 PM ET; demo video capped at 3 minutes.
- Full eligibility, registration, and evidence checklist: GitHub issue
  [#10](https://github.com/mandaputtra/ping-pong-pay/issues/10).
