# Ping Pong Pay — Pitch Deck

Converted from `Arteri _ Pitch Deck.pptx`, renamed to Ping Pong Pay, token set to USDC. 14
slides. Unfilled placeholders shown as `[X]` / `[Y]` / `[Z]` / `[N]` remain unfilled.

**Monad Metropolis Hackathon · Track 02, Consumer Products & Payments**

---

## 01 · Overview

> **Approved. Paid.**
>
> Ping Pong Pay gives freelancers instant payments. Faster than a bank, cheaper than a
> marketplace, as easy as a link.
>
> Send a link, your client pays, and the money is yours in about a second.

## 02 · Agenda

1. Overview — the idea in one line
2. Problem — what hurts today
3. Solution — what Ping Pong Pay does
4. Target Market — who we build for
5. Product — flow, tech, and why Monad
6. Market Size — TAM, SAM, SOM
7. Market Validation — proof and user feedback
8. Business Model — how we earn
9. Competition — alternatives compared
10. Roadmap — built, next, later

## 03 · Problem

> **Sarah's work was approved. Her money is 14 days away.**

| Problem | Detail |
|---|---|
| **10–20%** — the fee | Marketplaces take it up front. On a $500 job, up to $100 is gone. |
| **7–14 days** — the wait | Money is approved but unusable until the platform releases it. |
| **Up to ~9%** — the workarounds | PayPal, Wise, and Stripe stack fees, and what works depends on your country. |

> Work approved, money untouchable. That gap is the problem.

## 04 · Solution

> **Send a link. Get paid in about a second.**

1. **Create a request** — amount + description
2. **Share the link** — any channel
3. **Client taps Pay** — Face ID, done
4. **Money lands** — balance updates live in USD

- **Instant** — no clearing period, no holds.
- **Cheap** — a small fee per transaction, far below the 10–20% marketplaces take.
- **Borderless** — the payment itself is the same in any country.

## 05 · Target Market

**Sarah, 29, freelance designer** — 3–6 clients at once, $150–$1,500 projects. Waits 7–14 days
and loses 10–20%. Wants money the moment work is approved, without learning anything new.

**Alex, 34, startup founder** — hires Sarah directly and repeatedly. Dislikes marketplace fees
but has no simple, safe alternative. Wants a payment that feels like a normal invoice link.

> Starting point: freelancers with a direct client, especially across borders.

## 06 · Product · User Flow

> **Three taps for the client. Zero learning curve.**

**Freelancer**
- Sign up with Face ID or fingerprint
- Create a request: amount + description
- Share the link anywhere
- Watch the balance update live, withdraw when you want

**Client**
- Open the link: see amount, description, name
- Sign in or sign up with Face ID
- Optionally add a tip, then tap Pay
- See "Payment sent". Nothing else to do

> Confirmed on Monad in under a second. Tap to receipt in under 3 seconds.

## 07 · Product · Architecture

> **Blockchain inside. Dollars outside.**
>
> We never hold your money. Payments go straight from wallet to wallet.

| What users see | What happens underneath |
|---|---|
| Face ID sign-up | A passkey creates a wallet. No seed phrase. |
| "$500 paid" | USDC moves directly from client wallet to freelancer wallet. |
| One Pay button | One on-chain transaction. Network gas is covered by Ping Pong Pay. |
| Optional Wallet screen | Checkable balance and history, added because early users asked for it. |

## 08 · Product · Why Monad

> **"Instant" only works if it is actually instant.**

| | | |
|---|---|---|
| **< 1 sec** confirmation | Paying feels like a card tap, not a bank transfer. | |
| **~$0** fees | So low that Ping Pong Pay can absorb them invisibly. | |
| **EVM** compatible | Built with standard tools: Privy or Dynamic, viem, Solidity. | |

> Why Monad: speed and cost are what make a freelancer payment product possible.

## 09 · Market Size

> **Start narrow, where the pain is sharpest.**

| | |
|---|---|
| **TAM** | 1.57B freelancers worldwide (~46% of the global workforce) |
| **SAM** | Freelancers with direct client relationships. We start where marketplaces end. |
| **SOM** | Cross-border freelancers with repeat clients |

> Bottom-up: [X] freelancers × [Y] payments per year × $[Z] average payment.

## 10 · Market Validation

> **The market is moving here, and users shaped our product.**

| | |
|---|---|
| **700k+** | Deel contractors; $250M+ paid in crypto |
| **~70** | countries with Remote USDC payouts |
| **$1.5B+** | Rise lifetime volume |
| **3% → 9.6%** | pros paid in crypto in a year (Pantera) |

**What [N] freelancers told us**

- Show me my balance and activity — **built**
- Let clients add a tip
- Give me an income summary
- Let me split big projects — roadmap
- Give me invoice templates — roadmap

## 11 · Business Model

> **A small fee per transaction. Not 10–20%.**

| | |
|---|---|
| Marketplace, $500 job | Up to $100 |
| Ping Pong Pay, $500 job at [X]% per transaction | $[Y] |

**Second stream:** optional Plus tier — invoice templates, milestone payments, and the income
dashboard. The core payment flow is available on every tier.

## 12 · Competition

> **Nothing built for one direct, instant payment.**

| | Marketplace | PayPal.me / Wise link | Payroll platforms | Ping Pong Pay |
|---|---|---|---|---|
| **Speed** | 7–14 days | Days | Scheduled cycles | ~1 second |
| **Fee** | 10–20% | Stacked fees | Subscription | Small fee per transaction |
| **Built for one direct payment** | No | Not really | No | Yes |
| **Client effort** | Account + onboarding | Bank or card | Contractor onboarding | Open link, tap Pay |

## 13 · Roadmap

**Built now**
- Passkey sign-up
- Create-and-pay loop on Monad testnet
- Live balance and Wallet view

**Next**
- Tips and income summary
- Real off-ramp partner
- Card funding for first-time clients

**Later**
- Invoice templates
- Milestone payments
- Mainnet launch

> Demo runs on USDC on Monad testnet (`0x534b2f3A21130d7a60830c2Df862319e593943A3`).
> Withdrawal is simulated in the demo; a real off-ramp partner is on the roadmap.

## 14 · The Ask

> **Ping Pong Pay**
>
> Money moves the moment work is done.
>
> The ask: [off-ramp partners · pilot freelancers · feedback]
