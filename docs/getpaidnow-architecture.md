# GetPaidNow — Architecture v1.1

Converted from `GetPaidNow___Architecture_v1.1.docx`. Diagram content transcribed from the
embedded images. Unchanged in substance.

---

## Diagram Layer 1 — end to end

What actually happens, from nothing to cash:

```
┌─────────────────────────────────────────┐
│  Sign up                                │
│  Face ID or fingerprint only            │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Create and share request               │
│  Amount, description, shareable link    │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Client taps pay                        │
│  Opens link, confirms amount            │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Instant confirmation                    │
│  About 1 second on Monad testnet        │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Withdraw anytime                       │
│  Cash out to bank account               │
└─────────────────────────────────────────┘
```

## Diagram Layer II — system layers

What the user sees, what the server does, what the chain does:

```
┌─────────────────────────────────────────┐
│  Frontend (React app)                   │
│  Sign up, pay, wallet screens           │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Backend (Node.js plus DB)              │
│  Stores users, requests, transactions   │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Monad testnet (chain 10143)            │
│  Smart contract plus USDC token         │
└─────────────────────────────────────────┘
```

## Diagram Layer III — the pay moment

The single most important moment, technically — what happens in the second between "client
taps Pay" and "confirmed":

```
┌─────────────────────────────────────────┐
│  Client app                             │
│  User taps the Pay button               │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Embedded wallet signs                  │
│  Privy or Dynamic, no popup             │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Smart contract executes                │
│  payRequest on Monad testnet            │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  USDC transferred on-chain              │
│  Client wallet to freelancer wallet     │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│  Balance updates live                   │
│  Both screens refresh in about 1s       │
└─────────────────────────────────────────┘
```

### Custody note

"USDC transferred on-chain: client wallet to freelancer wallet" means a direct, non-custodial
transfer — the smart contract never holds or escrows the funds itself. `payRequest` calls the
USDC contract's `transfer` function straight from the payer's embedded wallet to the
freelancer's embedded wallet in the same transaction.

"Balance" on the Home and Wallet screens is simply the freelancer's own USDC token balance
(read via `balanceOf`), not an internal ledger inside the payment contract. This keeps the
contract stateless with respect to custody and removes an entire class of escrow/reentrancy
risk.

### Note on the activity list

Since the contract holds no internal ledger, the Wallet screen's chronological activity list
(payments, tips, withdrawals) is populated by the backend listening for `Transfer`/`payRequest`
events emitted on-chain and reconciling them against the Postgres `Transaction` table — not by
a contract-side read. Given the 18-day window, simple short-interval polling of recent blocks
for the relevant contract/token addresses is enough; a full indexer is not required for the
demo.
