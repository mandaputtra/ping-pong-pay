# PRD: Arteri — MVP (transcription)

Verbatim transcription of the source document, kept unmodified as a reference:

> Google Doc: `18JZWxeV-mGD9vM32tmuZvPRIO0hhD-uZ`
> Title: `Arteri | PRD for MVP (revision).docx`
> Prepared for the development team · Monad Metropolis Hackathon, Track 02 (Consumer Products &
> Payments) · Draft, October 1, 2026

Fetched 2026-10-06. Local copy of the original pitch deck derived from this PRD:
[`pitch-deck.md`](pitch-deck.md). Alignment assessment:
[`prd-alignment.md`](prd-alignment.md).

## Tab 1: Product Overview

### 1.1 Product at a glance

| Field | Value |
|---|---|
| Product name | Arteri |
| Tagline | Send a link. Get paid. |
| What it is | Arteri turns a payment link into instant pay for freelancers: cheaper than a marketplace, faster than a bank, and as easy as a link. |
| Type of product | Web app, mobile-responsive. No app store download. |
| Chain | Monad testnet for the hackathon build |
| Event and deadline | Monad Metropolis Hackathon, Track 02 (Consumer Products & Payments). Submission deadline October 14, 2026. |

### 1.2 Target market

Freelancers who have direct clients and get paid across borders, worldwide. Freelancer
friends in Indonesia are the first pilot group, not the limit of the market.

| | Freelancer (primary) | Client (secondary) |
|---|---|---|
| Who | Sarah, 29, freelance designer, 3–6 clients, projects of $150–$1,500 | Alex, 34, startup founder who hires Sarah directly and repeatedly |
| What they want | Get paid fast, keep more of what she earns, trust that her balance is real | Pay easily and safely, with no new account headaches or crypto steps |
| What stops adoption | Fear that a new payment method looks unprofessional | Fear of unfamiliar crypto steps or account friction |

- Market size (estimates): about 154 million online freelancers worldwide (World Bank, low
  estimate). About 23 million of them work with clients abroad and have direct clients (our
  assumption, to validate). Goal: 100 freelancers in 3 months and 1,000 in 12 months.
- Not in focus: finding clients, contracts and disputes (marketplaces do this well), and
  general money transfers between friends. Arteri only covers the moment a freelancer asks a
  direct client to pay.

### 1.3 The problem

| # | Problem | What happens |
|---|---|---|
| 1 | Fees are taken before you see the money | Fiverr keeps 20%. Upwork takes 0–15%. PayPal takes about 4.5% plus a fixed fee on international business payments. Fees stack up. |
| 2 | Waiting after approval | Marketplaces hold money for 7–14 days. PayPal, Payoneer, and Wise still take hours to 5 days to reach a local bank account. |
| 3 | Currency conversion costs you money | PayPal and Payoneer convert at their own rate, about 3–4% below the real rate. It is never shown as a fee. In our interviews, PayPal gave Rp17,200 per USD when the real-time rate was Rp17,700 (directional). |

### 1.4 The solution

| # | Problem | How Arteri solves it |
|---|---|---|
| 1 | Fees | One small fee, written into the payment contract and taken in the same transaction. No marketplace cut and no stack of separate fees. |
| 2 | Waiting | The payment settles on Monad in about a second, straight into the freelancer's Arteri balance. Arteri never holds the money, so there is no hold period. |
| 3 | Currency conversion | Payments run on USDC but users only see USD. Arteri creates no token of its own, sets no exchange rate, and converts nothing when the client pays. Conversion happens only if the freelancer withdraws to local currency, and the rate is shown first. |

> **Honest limits:** the last step to a local bank depends on an off-ramp partner and can
> still take time. In the demo, withdrawal is simulated. Say "paid in a second into your
> Arteri balance," not "in your bank in a second."

### 1.5 How it works in one minute

1. The freelancer creates a request (amount and description), sees the fee and what they
   will receive, and gets a link.
2. The client opens the link, signs in with an email code, and taps Pay.
3. One transaction on Monad sends the net amount to the freelancer and the fee to Arteri, in
   about a second.
4. The freelancer's balance updates right away. They can withdraw whenever they want.

Users only see dollars. The blockchain stays invisible by default. One optional Wallet
screen shows balance and activity, because early users needed proof that their money was
there.

### 1.6 Business model

- **Fee per transaction:** about 1% (working assumption, range 0.5–1.5%, still to validate).
  Enforced inside the payment contract so it cannot be skipped.
- **Who pays the fee:** default is the freelancer (deducted from what they receive), so the
  client pays exactly the request amount. Still open.
- **Plus subscription (later):** optional paid tier with invoice templates, milestone and
  partial payments, and an income dashboard. The core payment flow stays available to
  everyone.
- **Withdrawal:** Arteri adds no fee on withdrawal in this version. Any off-ramp partner fee
  is shown before the user confirms.

Cost to the freelancer on a $200 invoice:

| Option | Fee |
|---|---|
| Arteri (working assumption) | About $2 |
| Fiverr | $40 (20%) |
| PayPal (international business) | About $9.50, plus a 3–4% exchange-rate spread |
| Payoneer | $2 to $6 to receive, plus up to $4 to withdraw |
| Wise | About $1.20 |

Wise is cheaper on fee alone. Arteri competes on the link and speed: the client needs no bank
setup, and the payment is one link.

### 1.7 Why Monad

- Confirmation in under a second and very low fees make paying feel like a card tap, and let
  Arteri absorb network costs.
- Full EVM compatibility, so standard tools (Solidity, viem, ethers.js) work.

## Tab 2: Feature & Technical — Part A

### A1. MVP goals and priority tags

- Show a real payment moving from client to freelancer on Monad testnet, visible on two
  devices, in under 3 seconds end to end.
- Show no unnecessary blockchain language anywhere in the default user-facing product.
- Show the fee working: calculated, shown before commitment, and collected in the same
  transaction.
- Complete at least one real payment between two real people before submission.

Tags: **P0** required for the demo to work at all · **P1** build only if P0 is done and stable
· **P2** roadmap only, do not build before submission.

| Metric | Target for demo |
|---|---|
| Tap "Pay" to confirmed receipt | Under 3 seconds (Monad confirmation under 1 second plus UI) |
| Time to create an account | Under 30 seconds (email and one-time code) |
| First-time client from link to confirmation | Under 60 seconds, including the email code |
| Fee and net amount shown before a request is sent | 100% of requests |

### A2. How the MVP works

1. **Sign up.** The user signs up with an email and a one-time code through Privy or Dynamic.
   An embedded wallet is created automatically. No password, no seed phrase.
2. **Create request.** The freelancer enters a USD amount and description. The backend saves
   it as an off-chain database record and returns a shareable link. The chain is not touched
   yet, and the client's wallet address is not needed yet.
3. **Open link.** The client sees the requester name, amount, and description. A first-time
   client signs up inline with an email code, without leaving the page.
4. **Pay.** The client taps Pay. Their embedded wallet calls `payRequest` on the contract.
   The backend, not the client, supplies the freelancer address from the saved request.
5. **One transaction.** The contract computes the fee, sends the net amount to the
   freelancer, sends the fee to the Arteri treasury, and emits a `RequestPaid` event.
6. **Update.** The backend polls every 1–2 seconds, sees `RequestPaid`, marks the request
   Paid, and writes the transaction rows. The freelancer's balance and activity update on
   their device.
7. **Withdraw.** In the demo, withdrawal to a bank is a simulated off-ramp. The contract's
   job ends once the money has moved on-chain.

> **Design rules:** Arteri is non-custodial and never holds user funds. Every amount on
> screen is in USD, never a token symbol or raw unit. The Wallet screen is the one opt-in
> place where blockchain details can appear.

### A3. Features

#### Onboarding and authentication

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-1.1 | Create an account with email and a one-time code. No password, no seed phrase shown. | P0 | New user reaches a usable home screen within 30 seconds of first open |
| FR-1.2 | An embedded wallet is created automatically behind the account | P0 | No "seed phrase" or "private key" wording anywhere in onboarding |
| FR-1.3 | Returning users log in with an email code (or passkey, if added) | P0 | Returning user reaches the balance screen within 20 seconds |
| FR-1.4 | Optional passkey (Face ID / fingerprint) after signup | P1 | Skippable "Use Face ID next time" prompt appears once after signup |

#### Payment requests (freelancer side)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-2.1 | Create a request with a USD amount and a short description | P0 | Request and shareable link generated in under 5 seconds |
| FR-2.2 | Share the link by copy-link, SMS, or email | P0 | At minimum, "copy link" works |
| FR-2.3 | See the status of a sent request (pending / paid) | P1 | Status updates automatically once payment lands |
| FR-2.4 | A sent request amount cannot be edited | P1 | Editing is blocked, or a new request is required |
| FR-2.5 | "Allow Tip" toggle when creating a request | P1 | Toggle visible on Create Request, off by default |

#### Paying a request (client side)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-3.1 | Link shows amount, description, and requester name before any action | P0 | All three visible without scrolling on a standard mobile screen |
| FR-3.2 | A first-time client signs up and pays in one continuous flow | P0 | No external redirect breaks the flow |
| FR-3.3 | "Payment sent" confirmation right after paying | P0 | Renders within 3 seconds of tapping Pay |
| FR-3.4 | A simple test-funding path for the testnet demo | P0 | A payment completes end to end in a live demo with no manual steps |
| FR-3.5 | Tip presets (none / 10% / 15% / 20% / custom) when tipping is enabled | P1 | Client can pay with or without a tip, no added friction |

#### Balance and withdrawal

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-4.1 | Current balance on the home screen | P0 | Net payments received (after the Arteri fee) minus withdrawals recorded in the database |
| FR-4.2 | Withdraw to a bank account or, for the demo, a simulated off-ramp | P0 | Tapping "Withdraw" produces a clear success state |
| FR-4.3 | Balance updates in real time when a payment is received | P0 | A second device updates within 1–2 seconds of the payment landing on-chain |

#### Wallet / account details view

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-5.1 | A "Wallet" or "Account Details" screen | P0 | Reachable in 1 tap from the home screen |
| FR-5.2 | Shows current balance and a chronological activity list (payments, tips, fees, withdrawals) | P0 | Every item shows amount, counterparty label, and timestamp |
| FR-5.3 | Each activity item can reveal a block explorer link on tap | P1 | Link hidden by default, shown only after an explicit tap |

#### Income metrics (simplified)

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-6.1 | "This week" income total next to the main balance | P1 | Net payments received in the last 7 days |
| FR-6.2 | Lifetime total income received | P1 | All-time net received, independent of current balance |

#### Transaction fee

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-7.1 | Fee is a percentage of the total paid (base plus any tip), rounded down to the smallest token unit. Working assumption about 1%. | P0 | Net to freelancer plus fee always equals the total paid, to the smallest unit |
| FR-7.2 | Fee is collected in the same on-chain transaction and sent to the Arteri treasury address | P0 | One payment is one transaction with two transfers (net to freelancer, fee to treasury) |
| FR-7.3 | Create Request shows a breakdown: request amount, Arteri fee, net amount | P0 | Visible before the link is created |
| FR-7.4 | Client sees the total before tapping Pay. No fee is added on top by default. | P0 | With no tip, the amount on the Pay button equals the amount in the request |
| FR-7.5 | Fee percentage and treasury address come from configuration, not hard-coded in the client | P0 | Changing the fee needs no frontend change; a maximum cap is enforced on-chain |
| FR-7.6 | Each fee appears as its own line in Wallet activity | P1 | Fee rows carry the request reference and timestamp |
| FR-7.7 | No separate Arteri fee on withdrawal. Any off-ramp partner fee is shown before confirming. | P1 | Withdraw screen shows any partner fee before the Confirm button |

**Roadmap only (P2): do not build before submission.** Invoice templates by profession.
Partial payments (down payment and installments), which would change the data model from
one request and one payment to one request and several linked payments. Plus subscription.
Growth percentage and a USD/stablecoin display toggle.

### A4. Screens

| # | Screen | Key elements | Priority |
|---|---|---|---|
| 1 | Sign up / Log in | Arteri name, "Get Started" button, email field, one-time code entry. No fields for password, seed phrase, or wallet address. | P0 |
| 2 | Home / Balance | Large balance, "New Request" button, "Withdraw to Bank" button, recent requests with status, 1-tap entry to Wallet. Adds "This week" and lifetime income (P1). | P0 (P1 additions) |
| 3 | Create Request | Amount (numeric keypad), description, fee breakdown (request amount, Arteri fee, you receive), "Create Request" button. On success: link with "Copy Link" / "Share". Adds "Allow Tip" toggle, off by default (P1). | P0 (P1 addition) |
| 4 | Pay a Request (client) | Requester name, large amount, description, single "Pay" button. First-time client signs up inline with an email code. Tip presets only if the request has tipping enabled (P1). | P0 (P1 addition) |
| 5 | Payment Confirmation | "Payment Sent" or "Payment Received" message, amount, timestamp. Explorer link only if tapped. | P0 |
| 6 | Withdraw | Amount (defaults to full balance), destination, any partner fee, "Confirm" button, success state. | P0 |
| 7 | Wallet / Account Details | Current balance, chronological activity list (payment, tip, fee, withdrawal), optional "View on Explorer" shown only on tap. | P0 |

### A5. Technical approach

The priority is a real, working demo on Monad testnet, not production-grade infrastructure.

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | React (Next.js or Vite) | Fast to scaffold, easy to make mobile-responsive without native apps |
| Backend | Node.js / Express, or Next.js API routes | Whole app in one Repl, simplest deployment for a demo |
| Database | Postgres (for example Neon), or Replit's built-in database for a faster start | Relational queries for requests, users, and transactions |
| Blockchain access | viem or ethers.js, pointed at a public Monad testnet RPC | Works with any EVM chain, no custom SDK |
| Wallet and login | Privy or Dynamic embedded wallet SDK [to decide] | Built for "no seed phrase, sign in with an email code, add a passkey later" |
| Smart contract | Minimal Solidity contract: pay a request with optional tip and fee split | Keep as small as possible |

#### Smart contract (non-custodial)

The contract never holds funds. Each payment moves directly from the payer's embedded wallet
in one transaction, split between the freelancer (net amount) and the Arteri treasury (fee).
One function covers the MVP:

```
payRequest(uint256 offChainRequestId, address freelancer,
           uint256 amount, uint256 tipAmount)
```

- Computes `total = amount + tipAmount` and `fee = total × feeBps / 10000` (rounded down).
- Calls the token's `transferFrom` twice: `total − fee` to the freelancer, `fee` to the
  treasury. The payer must approve the contract once, or the wallet SDK batches approve and
  pay in one signed action.
- Requires `total > 0`. Rejects the call if `offChainRequestId` was already paid, which
  prevents double-fulfilment of one link.
- Emits the event below so the backend can mark the request Paid and fill the activity feed.

```
event RequestPaid(uint256 indexed offChainRequestId,
  address indexed payer, address indexed freelancer,
  uint256 amount, uint256 tipAmount, uint256 feeAmount)
```

- Fee parameters: `feeBps` and `treasury` are stored in the contract and changeable only by
  the owner. A hard maximum on `feeBps` (for example 500, i.e. 5%) is enforced. The payer's
  client can never supply or change the fee.
- Access control: anyone with the link can call `payRequest`, like an invoice link. What must
  be protected is the `freelancer` field: the backend supplies it from the original request
  record, so a payer cannot redirect funds by tampering with the client-side call. The
  contract itself does not compare the `freelancer` or `amount` to the saved request, so the
  backend must check every `RequestPaid` event (`freelancer` and `amount`) against the
  request record before marking it Paid. [to decide] A backend-signed authorization verified
  by the contract would enforce this on-chain.
- **Not on the contract:** no `createRequest`, `getBalance`, or `getActivity`. "Balance" is
  the net amount received from `RequestPaid` events minus withdrawals recorded in the
  database. Because withdrawal is simulated in the demo, the on-chain `balanceOf` does not go
  down, so it is used only as a live cross-check. "Activity" is built by the backend from
  `RequestPaid` events and database records. Withdrawal happens off-chain.

#### Funding the demo payment

- **Chosen path (Option A):** deploy a self-minted mock ERC-20 test stablecoin and pre-fund
  each test client's embedded wallet before the demo. The fee is collected in the same
  token. The client-facing experience looks identical. Swapping in real USDC later is a config
  change, since the contract only needs a standard ERC-20 interface.
- **Gas:** MON on public faucets is rate-limited (roughly 0.1–2 MON per address per 24 hours).
  Claim gas for every test wallet across several days in advance. The treasury address needs
  no gas to receive fees.
- **Stretch, only after Option A works:** bridge real USDC with Circle's CCTP (Option B), or
  add a card on-ramp through Privy or Dynamic (Option C), which is the honest answer to "how
  does a real client get funds in?"

#### Real-time updates

While a payment is expected, poll every 1–2 seconds: the freelancer's token `balanceOf`
(cross-check for the home balance) and recent blocks for `RequestPaid` events matching the
freelancer's address (flip a request from Pending to Paid and add to the Wallet activity
list). Use a WebSocket instead if the library supports it on the Monad testnet RPC.
Short-interval polling is acceptable and much faster to make reliable than a full
event-indexing pipeline.

#### Data model

| Entity | Key fields |
|---|---|
| User | id, display name, embedded wallet address, created_at, weekly_income (derived, net), total_income (derived, net) |
| Request | id, creator_id (freelancer), payer_identifier (email or phone, optional), amount, description, tip_enabled, tip_amount (filled at payment), fee_bps (snapshot at creation), fee_amount (filled at payment), net_amount, status (pending / paid), created_at, paid_at |
| Transaction | id, request_id, type (payment / tip / fee / withdrawal), on-chain transaction hash, amount, timestamp. Payment, tip, and fee rows are written when the backend sees a matching `RequestPaid` event. |

The Request entity has no wallet-address field on purpose: the client usually has no wallet
yet when the request is created. The freelancer's wallet address on the User entity is what
`payRequest` pays out to.

#### Account recovery and security

- Use the built-in recovery of Privy or Dynamic (typically cloud, social, or email-linked
  recovery) rather than leaving one device as the only way back in. Confirm what the chosen
  SDK offers before committing to it. **Decide before Oct 5.**
- A payer cannot change or skip the fee, which is enforced on-chain. The freelancer address
  comes from the backend, and the backend marks a request Paid only when the on-chain event
  matches the saved request.
- P1: an in-app toast or badge when polling sees a new `RequestPaid` event, so the freelancer
  does not need to keep the app open to know they were paid.

#### Non-functional requirements

- No blockchain terms (wallet jargon, gas, transaction hash, seed phrase) in the default UI.
  The Wallet screen is the one opt-in exception.
- Payment confirmation renders within 3 seconds end to end.
- Usable on a standard mobile browser with no app store download.
- All amounts, including the fee, are shown in USD on every screen except the optional
  explorer link.
- Arteri custodies no user funds at any point.

#### Edge cases

| Scenario | Expected behavior |
|---|---|
| Expired or already-paid link | Clear message ("This request has already been paid" or "This link is no longer valid"), never a raw error or blank screen |
| Client has insufficient testnet funds | Clear message with a top-up path, never a silent failure |
| Confirmation takes longer than expected | Brief, reassuring "Confirming…" state, capped at a few seconds |
| Withdraw more than the available balance | Amount capped at balance, inline validation message |
| Tip larger than the base amount | Allowed, with a simple confirmation step to avoid accidental overpayment |
| Two people tap Pay on the same link in the same second | Contract rejects the second call once the request ID is paid. Second payer sees "This request was just paid by someone else". |
| Fee rounds to zero on a tiny payment | Allowed. Fee rounds down and net plus fee still equals the total. Consider a minimum request amount. |
| Fee percentage changed after a request was created | Request keeps the fee shown at creation as its display value, but the contract applies the current on-chain fee. Do not change the fee during the demo window. |

### A6. Open decisions and build defaults

Build with these defaults unless the founder decides otherwise. Fee bearer and fee percentage
must be settled before the contract is deployed.

| Decision | Build default |
|---|---|
| Fee bearer [to decide before Oct 5] | Freelancer-side deduction, so the client pays exactly the request amount. Make it switchable by configuration. |
| Fee percentage [to decide] | About 1% (range 0.5–1.5%). Set before contract deployment, with an on-chain cap. |
| Fee on tips | Yes: fee applies to base plus tip. |
| Minimum request amount [to decide] | Not decided. For example $1, so the fee never rounds to zero. |
| Off-ramp for the demo [to decide] | Simulated. Open question: whether one test payment should use a real, even manual, bank transfer. |
| Request link expiry [to decide] | Not decided. For example 7 days. |
| Explorer link target [to decide] | Not decided: public Monad testnet explorer, or a simple in-app transaction detail view. |
| Client account | Client signs in with an email code. Open question: whether to offer a no-account, card-only path later. |

### A7. Verify before relying on it

- Monad testnet details. The PRD lists chain ID 10143 and a Circle-issued USDC contract at
  `0x534b2f3A21130d7a60830c2Df862319e593943A3`, and notes a testnet reset on 16 December 2025.
  Re-check all three.
- Also check: Monad's documented confirmation time (use one consistent claim, "under one
  second"), the recovery options Privy or Dynamic provide, and current MON faucet limits.

## Tab 2 — Part B: Vibe Coding on Replit

This part is about how to build the MVP with Replit Agent. Everything in Part A is the spec.
The Agent works best when it gets small, clear, outcome-focused steps, and when you keep the
checkpoints Replit saves as it works.

### B1. Ground rules

- **Outline first, then prompt.** Part A is the outline of features and flows. Do not ask for
  the whole app in one prompt.
- **One outcome per prompt.** Describe the result you want and the few details that matter.
  Let the Agent pick the implementation unless you have a strong preference.
- **Ask before choosing.** For unclear choices, ask the Agent about options and trade-offs
  first.
- **Test after every step, then keep the checkpoint.** If a step goes wrong, roll back to the
  checkpoint before the change instead of stacking fixes.
- **Keep prompts focused.** Share only the files or references the Agent needs. If the Agent
  loops or freezes, stop it and start a new chat with a tighter prompt.
- **Secrets stay in the Secrets pane.** Never paste keys into a prompt or into code.

### B2. Starter prompt (paste once, at the start)

> Build Arteri, a mobile-responsive web app where a freelancer requests payment from a client
> through a link.
>
> Stack: React (Vite or Next.js), Node/Express, Postgres, viem.
>
> Rules for the whole project:
> 1. Show every amount in USD. Keep blockchain words (wallet, gas, transaction hash, seed
>    phrase) out of the main UI.
> 2. Arteri never holds funds. A payment goes straight from the payer to the freelancer, with
>    a small fee to an Arteri treasury.
> 3. The fee percentage and treasury address come from config, and the client can never set
>    or change them.
> 4. The backend supplies the freelancer address from the saved request, never the browser.
> 5. Work one step at a time and build only what each prompt asks.

### B3. Suggested build order

Do P0 first. P1 only starts once the P0 loop is stable. Dates follow the project milestones.

| # | Dates | What to build |
|---|---|---|
| 1 | Oct 5–7 | Email sign-up and embedded wallet, connected to Monad testnet (P0) |
| 2 | Oct 8–10 | Create Request and the client pay page, saved off-chain (P0) |
| 3 | Oct 8–10 | Contract, mock token, Pay with fee split (P0) |
| 4 | Oct 8–10 | Live balance and request status across two devices (P0) |
| 5 | Oct 10–11 | Wallet view, simulated Withdraw, edge cases, first real test payment (P0) |
| 6 | Oct 11–12 | Only if P0 is stable: tip toggle, income metrics, passkey (P1), then polish |

> **Before Oct 5:** settle the fee percentage and who pays it, pick the funding path and the
> recovery path, and start claiming MON gas for the test wallets across several days. Oct 14
> is the submission deadline. Submit early, and do not test new changes on the final day.

### B4. Do by hand, or check carefully

- **The smart contract.** Do not accept it unread. Review the fee math, the already-paid
  check, and the owner-only fee settings yourself, and test it on testnet before the UI
  depends on it. Deploying the contract and the mock token is a separate task from the Agent
  prompts, with the tooling of your choice (for example Foundry or Hardhat).
- **Test wallets.** Claim gas and pre-fund the mock token for every test wallet days before
  the demo.
- **Real devices.** Test the full loop on two real devices, not only in the Replit preview.

### B5. Keep these in Replit Secrets

Auth provider keys (Privy or Dynamic), the Monad RPC URL, the database URL, the contract
address, the token address, the treasury address, and the fee percentage. The repository will
be public for submission, so confirm that no key was committed before it is made visible.

### B6. Before submission (developer items)

- A live, reachable deployed link running on Monad testnet.
- A public code repository with no secrets in it.
- A visible fee line in the Wallet activity during the demo.
- The demo shown on two real devices, plus a pre-recorded fallback clip of the core loop in
  case Wi-Fi or the testnet RPC misbehaves.

## Tab 3: User Journey

*(Swimlane flow from request to payment and withdrawal — present as a diagram image in the
source document; text not extractable.)*

## Tab 4: Architecture

### 4.1 Layered System Blueprint

Non-custodial payment request for freelancers on Monad testnet (chain 10143). *(Diagram
image in the source document.)*

### 4.2 Payment Flow

Sequence from payment request to on-chain fee split and backend confirmation. *(Diagram
image in the source document.)*

> How to Read:
>
> - 1-3 — The freelancer creates a request; the backend returns a public pay link with the fee
>   breakdown, which the freelancer shares.
> - 4-5 — The payer opens the link and signs in; the backend prepares the approve and pay
>   request transactions.
> - 6-7 — The embedded wallet signs (no seed phrases) and submits the signed transaction to
>   Monad.
> - 8 — The payment contract splits the payment in one transaction: net amount to the
>   freelancer, capped fee to the Arteri treasury.
> - 9-11 — The backend event listener sees `RequestPaid`, verifies the receipt on-chain,
>   updates records, and notifies the freelancer.
>
> Dashed arrows are responses or events returning to the caller. The backend never holds
> funds.

### 4.3 Data Model (Postgres)

Three tables. The diagram is simplified; the full field list is in Tab 2, Section A5 (Data
model). *(Diagram image in the source document.)*

> Note:
>
> - Relationships — a user creates many requests; a request settles through many transactions;
>   a user owns many transactions (withdrawals have no request).
> - `Transactions.type` separates payment, tip, fee and withdrawal records.
> - `Request.status` is pending or paid (an expired value is added only if link expiry is
>   adopted; see A6 in Tab 2). The event listener uses `transactions.tx_hash` to match
>   `RequestPaid` events to records.
> - Notation — crow's foot = many; double bar = exactly one.

## Tab 5: Wireframe

*(Low-fidelity desktop screens — diagram images in the source document.)*