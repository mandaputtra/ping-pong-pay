# Ping Pong Pay

**Approved. Paid.** Instant USDC payments for freelancers — send a link, your client pays,
the money is yours in about a second. Built for the Monad Metropolis hackathon
(Track 02, Consumer Products & Payments).

## How it works

1. Sign up with a social login, email, or Face ID — a wallet is created for you, no seed phrase.
2. Top up demo USDC with one click.
3. Create a payment request (amount + description) and share the link anywhere.
4. Your client opens the link, sees who is asking for how much and why, taps Pay, confirms once.
5. The balance updates live in dollars, and received payments appear in an activity list.
6. Cash out is **simulated**: the screen is labelled as a demo, no bank is connected, and
   no funds move. No real off-ramp ships.

No escrow contract holds money — payments move directly wallet to wallet. The reference
architecture this product draws on is a different, escrow-based design, kept unmodified as a
source document: [`docs/getpaidnow-architecture.md`](docs/getpaidnow-architecture.md).

## Run it

Prerequisites: [pnpm](https://pnpm.io) 10+ and Node 22+.

```bash
git clone https://github.com/mandaputtra/ping-pong-pay
cd ping-pong-pay/app
pnpm install
cp ../.env.example .env      # then fill in VITE_PRIVY_APP_ID
pnpm dev                     # app on http://localhost:3101
```

That is enough to sign in, see your balance, and create a payment link. To watch a
payment actually land you also need the top-up service in a second terminal:

```bash
pnpm relayer                 # top-up service on :8791
```

You need three things to demo the full loop:

1. **`VITE_PRIVY_APP_ID`** from [dashboard.privy.io](https://dashboard.privy.io). Enable the
    login methods you want (email, Google, Apple, GitHub) and add
    `http://localhost:3101` as an allowed origin, or sign-in will fail.
2. **Testnet USDC in two wallets** — yours and your payer's. Circle's faucet
    (<https://faucet.circle.com>, Monad Testnet) releases 20 USDC per address every 2 hours.
3. **Testnet MON in the relayer wallet** for gas. The Monad faucet is at
    <https://faucet.monad.xyz>.

| Variable | Where it runs | Purpose |
|---|---|---|
| `VITE_PRIVY_APP_ID` | browser | Privy project ID. Public by design. |
| `RELAYER_PRIVATE_KEY` | **relayer only** | Hot wallet funding demo top-ups. Never reaches the browser. |
| `VITE_RELAYER_URL` | browser | Relayer base URL. Leave empty locally; defaults to `http://localhost:8791`. |

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

## AI tools and hackathon disclosure

Per the Metropolis Terms & Conditions §4.1.4: **this project was built with AI coding tools.**
An AI assistant (Claude, GPT-5-class models) did the research, implementation, test-writing,
code review, and documentation under the author's direction, and every change was reviewed
before commit.

The agents were held to verifying their own work by running the product rather than reading
it. Several real defects were caught that way: a 502 from a relayer that never loaded `.env`,
a confirmation animation stuck at zero opacity, and a replay-protection window wider than the
RPC permits. All code is published for review under [MIT](LICENSE).

- Submission deadline **13 Oct 2026, 11:59 PM ET**; demo video capped at **3 minutes**.
- Full eligibility, registration, and evidence checklist: GitHub issue
  [#10](https://github.com/mandaputtra/ping-pong-pay/issues/10).
