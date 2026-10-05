# Manual review: React shell, design tokens, and pay-screen UX

Closes the loop on #13 and #9, which were closed as *implemented* but never reviewed by a
human with fresh eyes. Every automated check passed; automated checks cannot tell you
whether the product feels right.

Nothing here is a known bug. Each item is a question only a person can answer.

## How to review

```bash
cd app
pnpm install
cp ../.env.example .env      # fill VITE_PRIVY_APP_ID + RELAYER_PRIVATE_KEY
pnpm dev                     # app on :3101
pnpm relayer                 # top-up service on :8791 (separate terminal)
```

You need testnet USDC in two wallets to see a payment land. Circle's faucet
(https://faucet.circle.com, Monad Testnet) gives 20 USDC per address per 2 hours.
Your demo wallet is `0x777C742eFd1ceE02Dd791DfCda9d3199EE5FE58C` (currently funded);
the relayer is `0xF1b291D8dcdaa2c3041c46707a066100d800F964`.

## The path that matters

Time the whole thing. If it takes more than ~90 seconds from opening the link to seeing a
receipt, that is the finding.

1. Sign in with email or a social login. Does a wallet get created without you noticing
   or asking for a seed phrase?
2. Read the balance. Does `$22.00` feel like money to you, or does it feel like a crypto
   balance with a dollar sign bolted on?
3. Enter an amount and a description, create a link. **Try to break the amount input:**
   `1.234`, `-5`, `1e5`, `0`, empty, `5000.01`. Each should refuse with a sentence you
   understand, not `NaN` or `Invalid BigInt`.
4. Copy the link. Does the confirmation ("Copied") actually register?
5. Open the link in a **private window** — a real guest, no session. This is the demo's
   centrepiece and the least-tested path.
6. Sign in as the payer and pay. Count the confirmations. **Anything more than one is a
   finding** — a gas prompt or a wallet-creation prompt leaking in breaks the product.
7. Read the receipt. Does "amount, recipient, time, explorer link" answer the question
   "did this work?" without you clicking through?
8. Reload the same link. You should see the receipt, never a second payment.

## Questions automated tests cannot answer

- [ ] **Copy from `docs/ux-patterns.md` §5 applied verbatim?** #9 claims it. Nobody has
      diffed the actual strings in `app/src/lib/guards.ts` and `app/src/lib/topup.ts`
      against the deck. This is the most likely unverified claim in the repo.
- [ ] **"Locale-aware formatter" via `Intl.NumberFormat`** — both tickets name this
      specifically. The code uses `toLocaleString` and `Number.toFixed` rather than
      constructing an `Intl.NumberFormat` instance. Probably equivalent in practice;
      confirm you are satisfied, or decide it should be literal.
- [ ] **Status never conveyed by colour alone** — check every success/failure/pending
      state still reads correctly in greyscale.
- [ ] **Is any copy still jargon?** "Non-custodial", "gas", "EIP-712", "nonce",
      "signature" must not appear in payer-facing text.
- [ ] **Token layer applied across screens**, not just the first one. Check the activity
      list and cash-out screens specifically — they were added later than the token work.
- [ ] **Touch targets ≥44px** — `--target-min` is applied to buttons in `app.css`.
      Verify on the inputs and the pay link too.
- [ ] **Motion** — 200ms status fade and checkmark draw, 1000ms pending spinner.
      Enable OS "reduce motion" and confirm nothing animates but the checkmark still
      appears (it must land fully drawn, not stay invisible).

## Known ceilings — decide, don't discover

These are documented in code with the upgrade named. They are fine for a demo; say so
explicitly if you disagree.

- **Replay scan covers only the last ~100 blocks.** Monad's public RPC rejects wider
  `eth_getLogs` ranges (verified: 100 works, 120 errors). That is ~30 seconds. A replay
  from a *different* browser is only caught inside that window. The local nonce ledger
  covers same-browser replay. If a judge asks "can this be paid twice?", the honest
  answer is "not on one browser, and not within 30 seconds anywhere".
- **Activity history is likewise ~30 seconds.** A deep backfill is impossible over the
  public RPC. Any payment older than one chunk is invisible to the list. An indexer or a
  paid RPC is the fix, and one indexer would fix both this and the replay window.
- **Descriptions are matched by amount + counterparty.** They are unsigned prose that
  never reach the chain, so they live in the creating browser. Two identical payments from
  the same payer would show the first note. Unmatched payments show blank by design.

## Submitting

See #10 for the compliance checklist and the 13 Oct deadline. #19 is the demo pack.