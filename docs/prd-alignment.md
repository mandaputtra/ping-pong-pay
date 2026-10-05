# PRD alignment assessment

PRD: [`arteri-prd.md`](arteri-prd.md) (Arteri MVP, draft 1 Oct 2026). Assessed 2026-10-06
against the built app.

**Summary: the demo loop matches. The business model does not exist.** Every P0 screen and
flow in Tab 2 is working and verified on Monad testnet — except the transaction fee, which the
PRD classifies as P0 and which is absent, along with the smart contract, the database, and
the fee-split business model the product is sold on.

This is a deliberate architectural divergence, recorded in
[ADR-0001](adr/0001-offchain-invoices-no-escrow.md) before the build. It was a decision, not an
oversight. But a judge reading the PRD will score against it, so the gap needs a story rather
than a hope.

## Aligned and verified

| PRD requirement | Priority | Status |
|---|---|---|
| FR-1.1 Sign up with email, no password or seed phrase | P0 | Working, verified in browser |
| FR-1.2 Embedded wallet created automatically | P0 | Working (Privy) |
| FR-3.2 First-time client signs up and pays in one flow, no redirect | P0 | Working, browser-verified |
| FR-3.3 "Payment sent" confirmation within 3 seconds | P0 | Working, motion per `docs/demo-ux.md` |
| FR-2.1 Request with USD amount + description | P0 | Working |
| FR-2.2 Share by copy link | P0 | Working |
| FR-4.1 Current balance on home | P0 | Working |
| FR-4.2 Withdraw (simulated off-ramp) | P0 | Working, labelled as simulated |
| FR-4.3 Balance updates in real time | P0 | Working, 4s poll |
| FR-5.2 Activity list: amount, counterparty, timestamp | P0 | Working |
| FR-3.4 Simple test-funding path | P0 | Working (relayer, $2 top-up) |
| Link expiry (A6: "for example 7 days") | P1 | Working, 7 days |
| Explorer link target (A6: "not decided") | P1 | Working — MonadVision, chosen |
| Minimum request amount (A6: "for example $1") | P1 | Working — $0.01 floor via `parseAmount` |
| Edge case: expired / already-paid link | P0 | Working, verified in browser |
| Edge case: withdraw more than balance | P0 | Working, inline validation |

## Divergences

### 1. No transaction fee — the big one

**PRD: FR-7.1–7.5, all P0.** "One small fee, written into the payment contract and taken in the
same transaction." Fee ~1%, collected to an Arteri treasury in the same transaction as the
payment, shown as a breakdown before the link is created, and appearing as its own line in
Wallet activity (FR-7.6).

**Built: nothing.** No fee, no treasury, no breakdown, no fee row. Verified by grep across
`app/src` — no fee logic exists.

This is not cosmetic. The PRD's entire business model (§1.6) is the fee, and the pitch deck's
competitive comparison ($2 vs Fiverr's $40 vs PayPal's $9.50) is built on it. A judge with
the PRD open will look for the fee line during the demo and not find it.

Three options, honestly costed:

| Option | Effort | Risk |
|---|---|---|
| **A. Add a fee, offchain** | Fee computed at request creation, net amount signed into the existing intent, paid as a direct transfer. Fee goes to a treasury address. No contract. | Changes the signed intent shape. ~half a day. Does not match "same transaction, on-chain, capped by contract". |
| **B. Build the PRD contract** | Solidity `payRequest` + `RequestPaid`, mock ERC-20, deploy to testnet, fee split in one tx. | PRD §B4 says do not accept a contract unread and test it before the UI depends on it. Two days minimum with no agent-verifiable deploy in the loop. Real deadline risk. |
| **C. Drop the fee from the story** | Amend the pitch deck and PRD-derived claims to a "no fee in the MVP, fee model validated later" position. | Honest, costs nothing technically. Weakens the competitive claim. |

My read: **A**, because it recovers the business model for the demo without a contract
deployment in the last week. The PRD's own §1.4 says the fee is "written into the payment
contract" — so if a judge reads that line, A does not fully satisfy it and the demo script
should not claim on-chain fee enforcement.

### 2. No smart contract

**PRD A5.** A minimal Solidity contract with `payRequest` and `RequestPaid`, fee split in one
transaction, already-paid check on-chain, owner-only fee settings, `feeBps` capped on-chain.

**Built: none, by design.** ADR-0001 records the decision: direct USDC transfer, offchain
EIP-712 signed intent verified by the payer before signing. `docs/adr/0001-offchain-invoices-no-escrow.md`.

What this costs us, stated plainly:

- The PRD's on-chain already-paid check does not exist. Replay protection is a Transfer-log
  scan plus a browser nonce ledger, bounded to ~100 blocks by Monad's public RPC.
- A second payer *can* pay the same link from a different browser inside that window. The PRD
  would have rejected that at the contract.
- There is no on-chain fee cap because there is no fee.

What it buys, which the PRD also wanted: no contract to deploy, audit, or get wrong in the
final week; no `approve` transaction before Pay, so genuinely one confirmation.

### 3. No database

**PRD A5.** Postgres with User / Request / Transaction tables. `Request.status` pending → paid.
Activity built from `RequestPaid` events joined to database records.

**Built: no backend and no database.** State lives in the payer's `localStorage` (receipts,
used nonces, notes) and in chain logs. Activity is rebuilt from USDC `Transfer` events.

Consequences a judge could probe:

- A request's pending/paid status is not queryable server-side (FR-2.3 is P1, unimplemented).
- Activity history is ~30 seconds deep, not forever — the public RPC rejects `eth_getLogs`
  ranges wider than ~100 blocks.
- Notes are matched to payments by amount + counterparty, so two identical payments from one
  payer could show the first note.

### 4. No requester name on the pay screen

**PRD FR-3.1, P0.** "Link shows amount, description, and **requester name** before any action."
Screen 4 lists "Requester name" as the first element. Screen 1 lists "display name" on User.

**Built: `To 0x7099…79C8`.** There is no display name anywhere in the app — verified by grep.
The payer's most reassuring signal ("Sarah is asking for $25") is a hex string.

This is the cheapest high-value gap on the list. The name could travel in the link, unsigned
alongside the description, exactly as the description already does. Roughly an hour.

### 5. Submission deadline differs

PRD §1.1 and §B3 say **October 14, 2026**. The Metropolis T&C (§4.2) and the hackathon page
say **13 Oct 2026, 11:59 PM ET**. Our docs use the T&C date. The PRD is a day later — trust
the T&C, and submit early. Worth reconciling so nobody plans to the wrong day.

### 6. Funding path differs

**PRD A5 Option A:** self-minted mock ERC-20, pre-funded wallets.

**Built: real Circle-issued USDC** on Monad testnet, funded through Circle's faucet into a
relayer wallet. This is *better* than the PRD's assumption — the client-facing experience is
identical but the token is a real dollar stablecoin, not a mock. PRD §A5 says swapping in real
USDC later "is a config change"; we did that first. No action needed, but say so in the demo —
it is a strength, and the PRD understates it.

### 7. Replit → TanStack Start

PRD Part B assumes Replit + Next.js/Vite + Express. Built on TanStack Start (SSR) with a
~50-line Node host and no Express. Functionally equivalent, and the deploy story is simpler
(one container, two processes). Not a gap; noted so nobody is surprised by the stack.

## What is genuinely stronger than the PRD

Worth saying out loud in the demo, because these are real:

- **Real USDC, not a mock token** (see above).
- **Tamper resistance is stronger than the PRD's design.** The PRD's contract does *not*
  compare `freelancer` or `amount` to the saved request — it relies on the backend checking
  every event. Ours signs the full intent (recipient, token, amount, nonce, expiry) with
  EIP-712, so a payer verifies the terms cryptographically *before* signing. Editing the
  amount in the link fails verification outright, demonstrated in the demo.
- **No `approve` transaction**, so "one confirmation" is literally true. The PRD's design
  needs an approval first unless the SDK batches it.
- **61 tests**, including a jargon guard on all user-facing copy. The PRD asks for no
  blockchain words in the UI but has no mechanism enforcing it.

## Recommended order, if time allows before 13 Oct

1. **Requester name on the pay screen** (FR-3.1, P0) — ~1 hour, closes a P0 gap.
2. **Fee breakdown as display-only** — show what a 1% fee *would* be, labelled as not yet
   collected. Do not claim it is enforced. ~2 hours. Recovers the business-model story without
   a contract.
3. **Fee for real, offchain** (option A above) — half a day, only if 1 and 2 land clean.
4. Skip the contract. PRD §B4's own advice ("do not accept it unread", "test it on testnet
   before the UI depends on it") is not achievable in the remaining window without risking the
   whole submission.

Do not start the contract. The demo works; a half-tested contract in the last week is how a
working demo becomes a broken one.