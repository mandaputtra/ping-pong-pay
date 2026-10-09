# ADR 0002: Card checkout with a custodial USDC float

Date: 2026-10-09. Status: accepted. Amends ADR-0001 for the card path only.

## Context
ADR-0001 chose offchain signed invoices with a direct payer-to-recipient transfer, and that path is non-custodial: no contract, no float, the payer's own wallet moves the money.

That path cannot serve a payer who has no crypto. On Monad a zero-MON account cannot send any transaction at all (Reserve Balance: `gas_fees <= min(10 MON, balance)`, so a zero balance gives a zero budget), which means a wallet-based payer needs gas they do not have. Giving them gas still assumes they hold USDC and have a wallet. A client with a card has neither.

## Decision
Add a second payment path. The payer pays by card through a fiat provider; the platform holds a USDC float and pays the freelancer from it. The wallet path from ADR-0001 is unchanged and remains available.

The fiat provider sits behind one seam (`FiatProvider`) so the sandbox implementation used now can be replaced by a real processor without touching the pay screen.

## Alternatives
- **Gas stipend only**: cheapest, but the payer still needs the app's wallet, so it does not serve a card payer.
- **EIP-2612 / ERC-3009 gasless**: verified available on Monad USDC (`FiatTokenV2: permit is expired` proves the selector), but the payer still needs a wallet holding USDC.
- **Real fiat on testnet**: rejected outright. Taking real money and delivering testnet tokens is not shippable.

## Consequences
- **The platform becomes custodial for the card leg.** It holds the payer's fiat (in the provider's account) and the USDC float that settles payouts.
- **Mainnet is gated on compliance**, not code: a registered business account, KYC/AML, refund and chargeback handling, and likely money-transmission licensing. Out of scope for the hackathon.
- **On testnet the fiat leg runs in the provider's sandbox.** No real money touches testnet tokens; the checkout is labelled as simulated.
- The payout endpoint must only ever pay the recipient and amount recorded on a real request row, so the float cannot be drained to an arbitrary address.
- The wallet path stays non-custodial. This ADR supersedes ADR-0001 only for the card leg.
