# CONTEXT.md — ping-pong-pay

Ubiquitous language. Glossary only, no implementation.

## Glossary
- **Top-up**: acquiring USDC into the Wallet via testnet faucet / mock credit. Real fiat onramp (Mercuryo) is an explicit stretch goal, not launch scope.
- **Payment request (invoice)**: an offchain signed intent `{to, amount, nonce, expiry}` identifying who gets paid how much in USDC and until when. Shared as a link; settles as one direct USDC transfer.

- **User**: a person sending or receiving money through ping-pong-pay. Has no crypto knowledge assumed.
- **Wallet**: a Mera passkey-derived self-custodial EOA. Created at signup via Face ID / fingerprint; no seed phrase, no vendor backend.
