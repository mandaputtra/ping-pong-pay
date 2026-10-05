# Bounty checklist

Status as of the submission build. Read the gaps, not just the ticks.

## Privy — embedded wallets and auth

| Criterion | Status | Evidence |
|---|---|---|
| Privy used for wallet creation | ✅ | `app/src/lib/privy-user.ts` — embedded wallet only, never a foreign wallet |
| Wallets created inline during the pay flow | ✅ | Guest taps Get started; Privy creates the wallet mid-flow, no second screen |
| Monad testnet (chain 10143) | ✅ | `walletClientType === "privy"` wallet, live-verified |
| Social / email / passkey login | ⚠️ Partial | Email verified live. Social and passkey are enabled in the Privy dashboard but **not each verified in a browser** |
| Passkey used for payment confirmation | ❌ | Current flow confirms inside Privy's own prompt. The spec asks for a passkey/biometric at the Pay step; not demonstrated |

**The gap that matters.** Privy's bounty emphasises passkey authentication at the payment
step. We show "no seed phrase, no app install", which is the same claim in weaker form. If
the passkey confirmation is scoreable, this is where the points are.

**Fastest way to close it:** confirm one social login and one passkey in a real browser,
record them, and update the row. That is minutes of work, not a redesign.

## Agora — AUSD cross-border payments

| Criterion | Status | Evidence |
|---|---|---|
| Uses AUSD | ❌ | **The app settles in USDC** (`0x534b2f3A…943A3`), not AUSD (`0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`) |
| Cross-border payment demonstrated | ❌ | No second country, no FX, no off-shore payer in the demo |
| AUSD faucet integrated | ❌ | Top-up goes through our own relayer, funded by Circle's USDC faucet |

**This is the largest gap in the submission and it is not cosmetic.** The Agora bounty is
paid for demonstrating *cross-border* AUSD payments. We demonstrate domestic USDC payments.
The architecture would carry AUSD unchanged — it is a token address in
`app/src/lib/wallet.ts` and one entry in the signed intent — but the demo story does not
currently match the bounty.

**Three options, honestly costed:**

1. **Switch the token to AUSD** and fund the relayer from the AUSD faucet
   (`0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` on testnet). Small code change, honest
   bounty alignment, but the demo must then show a cross-border story or it still does not
   match the wording.
2. **Support both, demo AUSD.** Same change as above plus a second token constant. More
   surface, more to break.
3. **Skip the Agora bounty and compete on the track prize.** The Consumer Products &
   Payments track pays $30k across three teams, which the product as built can argue for on
   its own merits.

My read: option 1 if the faucet funds in time, otherwise option 3. Option 2 is the worst of
both — two tokens, one demo.

## Track prize — Consumer Products & Payments

| Criterion | Status | Evidence |
|---|---|---|
| Working product on Monad | ✅ | Full loop live: sign in → link → guest pay → receipt → balance moves |
| Payment UX a non-crypto user can finish | ✅ | Jargon-free copy enforced by test; no signup wall; one confirmation |
| Security reasoned about, not asserted | ✅ | EIP-712 intent, tamper/expiry/replay refusals all browser-verified |
| Documented honestly, including limits | ✅ | This file, plus `ponytail:` markers naming each ceiling in code |

## Evidence to have ready

Judges ask for proof, not claims. Have these open:

- A payment tx hash on MonadVision, and the explorer link from the receipt.
- `pnpm test` output: 61 tests green. Say the number out loud.
- The tamper demo: one character changed in the link, app refuses.
- The replay demo: reload the link, receipt returns, no second charge.

## Cross-border story, if we take the Agora bounty

The demo needs a payer who is not the freelancer. Cheapest credible version: the payer's
wallet is funded from a different source than the freelancer's, and the narration says
"client is in another country". Weakest possible version — the chain does not know where
anyone is, and pretending otherwise invites the obvious question.

Better: demo AUSD specifically because it is redeemable 1:1 USD and issued against
short-term Treasuries, and say plainly that the off-ramp is out of scope for the demo. That
is a real, defensible answer to "how does this become a cross-border payment".