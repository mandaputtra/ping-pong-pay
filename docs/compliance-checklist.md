# Submission compliance — Metropolis Hackathon

Clause references are to [`docs/terms-and-conditions.md`](terms-and-conditions.md). Status
as of 2026-10-05. Deadline: **13 Oct 2026, 23:59 ET**.

Anything marked **ACTION** can only be done by a human, usually while logged in to a site
only you have access to. Everything else is verified in this repo.

## Verified in the repo

| Clause | Requirement | Status | Evidence |
|---|---|---|---|
| §4.1.1 | Public GitHub repo | ✅ | `mandaputtra/ping-pong-pay`, visibility PUBLIC |
| §4.1.1 | Complete source | ✅ | 25 commits, 2026-09-28 → 2026-10-05 |
| §4.1.1 | Commit history over build window | ✅ | First commit 2026-09-28, last 2026-10-05. Hackathon build window is 1 Sep – 13 Oct 2026; **every commit falls inside it** |
| §4.1.1 | Open source license | ✅ | MIT ([LICENSE](../LICENSE)) |
| §4.1.1 | Attribution of external code | ✅ | TanStack Start · Privy · viem · Tailwind. One transcribed source doc ([`getpaidnow-architecture.md`](getpaidnow-architecture.md)) is marked as unmodified in its header |
| §4.1.4 | **AI tool use disclosed in README** | ✅ | [README](../README.md) § "AI tools and hackathon disclosure" — names Claude and GPT-5-class models, states what they did, MIT licensed |
| §4.1.3 / §9.2 | Monad testnet deployment, evidenced by tx hashes | ✅ | Two confirmed on-chain receipts below |
| §4.1.5 | Project description, architecture, stack, setup | ✅ | [README](../README.md) § How it works / Run it / Architecture; [AGENTS.md](../AGENTS.md); [CONTEXT.md](../CONTEXT.md) |
| §9.4 | Product shown in actual operation | ✅ | Verified live throughout: real transfers, not mocks. Recording is **ACTION** below |
| §10.1 | No false or misleading information | ✅ | Deliberate. Known ceilings are documented in code as `ponytail:` markers and listed in [`bounty-checklist.md`](bounty-checklist.md) and [`manual-review.md`](manual-review.md) |

### Monad transaction evidence (§9.2)

Both receipts read back `status: success` from `https://testnet-rpc.monad.xyz`.

| What | Tx hash | Block |
|---|---|---|
| Guest payment, $0.525328 USDC, payer → freelancer | [`0xd7d26dbc81eeb2a350f6f05ce45db0f9641bf7d9b2856cfe76acc6cbd4853891`](https://testnet.monadvision.com/tx/0xd7d26dbc81eeb2a350f6f05ce45db0f9641bf7d9b2856cfe76acc6cbd4853891) | 68173658 |
| Top-up, $2.00 USDC, relayer → wallet | [`0x805de045b73c8591d11065ae9be76f5f9d6d73c7d458c806c8f0c2e158334a70`](https://testnet.monadvision.com/tx/0x805de045b73c8591d11065ae9be76f5f9d6d73c7d458c806c8f0c2e158334a70) | 68087869 |

Addresses: USDC on Monad testnet `0x534b2f3A21130d7a60830c2Df862319e593943A3`.
No custom contract is deployed — the design deliberately has none
([ADR-0001](adr/0001-offchain-invoices-no-escrow.md)), so §9.2's "contract addresses (if
applicable)" does not apply. The integration is: USDC transfers on Monad testnet, and
Monad's sub-second block times, which is what makes the guest-pay confirmation feel instant.

Private keys in `app/src/lib/request.test.ts` are the standard public Anvil/Hardhat test
accounts (`0x59c6…690d`, `0x8b3a…ffba`). They hold nothing and are not secrets.

## ACTION — requires you, a human, possibly logged in

Ordered by how expensive the delay is to fix.

### 1. Record and publish the demo video (§4.1.2, §9.4)

- **≤ 3 minutes, hard.** Script: [`demo-script.md`](demo-script.md), timed to 2:55.
- Publicly accessible via YouTube, Loom, or Vimeo. **Unlisted is not public** — check the
  link from a logged-out browser before you rely on it.
- Must show a **successful top-up** and a **successful payment**. Relayer inventory is
  finite ($2 per top-up, $6 per address); check before you record so you are not
  re-filming a 503.
- Must show Monad blockchain interaction. The receipt's "View on MonadScan" link covers
  this.

### 2. Register the team on hackathon.monad.xyz (§2.4)

- Team of 1–5 members. Ours is effectively you.
- **Designate a primary contact.** Prizes are paid to that account's wallet (§6.1). Get
  the address right; prize payout going to the wrong wallet is not recoverable.
- Confirm every member is 18+ and not in a sanctioned jurisdiction (§2.1, §2.2).

### 3. Choose exactly one track and one project (§2.5)

Multiple submissions from one team are disqualified. Our track: **Consumer Products &
Payments**.

⚠️ **Decide the Agora question first.** The app settles in **USDC**; the Agora bounty is for
**AUSD**, and no cross-border flow is demoed. Full analysis and three costed options:
[`bounty-checklist.md`](bounty-checklist.md). Entering the Agora bounty without changing the
token risks submitting a claim the demo does not support — a §10.1 "false or misleading
information" problem, which is a disqualification ground.

Recommendation: either switch to AUSD before recording, or do not enter the Agora bounty and
compete on the track prize.

### 4. Read the actual submission checklist

The checklist on hackathon.monad.xyz is login-gated and has never been read by an agent.
Everything in this document is derived from the T&C PDF in [`terms-and-conditions.md`](terms-and-conditions.md),
which may not match the website's form field-for-field. Open it, and reconcile.

### 5. Submit through the website only (§4.1.6, §4.2)

No email submissions, no Discord-only submissions. Before you click, check:

- [ ] Repo public, MIT licensed, README shows the AI disclosure
- [ ] Video URL opens logged-out, is ≤ 3:00, shows a real payment
- [ ] Tx hash pasted or linked as Monad evidence
- [ ] One track selected, one project
- [ ] Primary contact wallet confirmed
- [ ] Team size and eligibility confirmed
- [ ] Agora bounty decision made

## Notes and discrepancies

- **Prize pool**: T&C §3.2 states $145,000; the website advertised $250,000+. §3.2 notes
  sponsor bounties are added later. Plan against the T&C figure.
- **Demo video cap** is 3 minutes in both §4.1.2 and §9.4. It is a hard limit, and the
  penalty is §10.1 disqualification, so the script targets 2:55.

## Known product limits to disclose if asked

Not disqualifying. Say them plainly rather than being asked:

- Replay protection and activity history both read only the last ~100 blocks, because
  Monad's public RPC rejects wider `eth_getLogs` ranges. ~30 seconds. Same-browser replay
  is additionally blocked by a persisted nonce ledger.
- Cash out is a simulation. No bank is connected; no funds move. Enforced by test.
- No custom payment contract. Funds move directly wallet to wallet by design.