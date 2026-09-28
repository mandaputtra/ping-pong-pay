# Payments Stack — ping-pong-pay on Monad

How users get a wallet, get stablecoins, and pay through shareable links.
Every claim below cites its primary source inline.

## 1. Wallet onboarding for users with no crypto

### Privy — hosted embedded wallets + auth

- What: self-custodial embedded wallets for Ethereum, Solana, and other chains, keys held in secure hardware (TEEs); supports non-custodial user wallets, server wallets, and server-delegated actions (https://docs.privy.io/wallets/overview/embedded).
- Login methods: email, SMS, socials, passkeys (https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets). Security model is TEE + Shamir's Secret Sharing (same page).
- Monad support: yes — Monad publishes an official Next.js + Privy embedded-wallet PWA template (https://docs.monad.xyz/templates/next-serwist-privy-embedded-wallet) and a React Native variant (https://github.com/monad-developers/react-native-privy-embedded-wallet-template).
- Cost: Developer plan is free and includes 50K signatures + $1M transaction volume/month; paid tiers $299/mo (500–2,499 MAU) and $499/mo (2,500–9,999 MAU); PAYG above 10,000 MAU / 50,000 signatures (https://www.privy.io/pricing).

### Dynamic — wallet infrastructure (now a Fireblocks company)

- What: one SDK combining auth, smart/embedded wallets, and key management across web, iOS, Android (https://docs.dynamic.xyz/, https://developers.fireblocks.com/docs/dynamic-embedded-wallets).
- Login methods: passkey, email/social/SMS sign-in; email OTP login is a dashboard toggle plus `connectWithEmail` / `verifyOneTimePassword` hooks (https://www.dynamic.xyz/docs/react/authentication-methods/email). Security model is TEE, with TSS-MPC added (https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets).
- Monad support: yes — listed as a Monad embedded-wallet provider on Monad mainnet and testnet (https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets).
- Cost: free self-serve start; MAU-based pricing with enterprise tiers — check current numbers before committing (https://www.dynamic.xyz/pricing).

### Mera — passkey-native EOAs, no vendor backend

- What: `npm install @category-labs/mera` derives self-custodial BIP-44 EOAs (EVM + Solana) from a passkey's WebAuthn PRF output — no seed phrase, no custody backend, no MPC service, nothing to deploy (https://mera.category.xyz/, https://docs.monad.xyz/guides/mera).
- Monad UX: one passkey prompt at onboarding, derive key via BIP-39/32, wrap in a viem account (`toViemAccount`) and transact normally; Monad chain IDs are 143 (mainnet, `monad`) and 10143 (testnet, `monadTestnet`) (https://docs.monad.xyz/guides/mera). Requires HTTPS (or localhost) and a PRF-capable authenticator such as iCloud Keychain or 1Password (https://mera.category.xyz/getting-started/).
- Cost: open-source client library, no per-user billing (https://github.com/category-labs/mera). Tradeoff: keys live in page memory during a signing session, so XSS/malicious dependencies are in scope, and passkeys are bound to the rpId (domain migration kills recovery without an exported mnemonic) (https://mera.category.xyz/concepts/security-model/).

### Take

| | Privy | Dynamic | Mera |
|---|---|---|---|
| Custody | Vendor TEE + SSS | Vendor TEE + TSS-MPC | None (passkey-derived, app holds key in memory) |
| Monad support | Official template | Listed provider | Official guide + demo |
| Free tier | 50K sigs/mo stated | Self-serve free | Free (open source) |
| Lock-in | Vendor SDK + dashboard | Vendor SDK + dashboard | None, but rpId-bound |

For the hackathon: Mera is the cheapest and most "Monad-native" demo story; Privy is the safest if you want email/SMS recovery and gas sponsorship without thinking.

## 2. Stablecoin + fiat rails on/into Monad

### Agora AUSD — the hackathon stablecoin

- What: fully-reserved digital dollar, 1:1 USD, redeemable at par; reserves in short-term Treasuries/overnight repo, managed by VanEck, custodied by State Street (https://www.agora.finance/product/ausd).
- Monad deployments (primary source for addresses): mainnet `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`, testnet `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`, plus a testnet faucet at `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` (https://docs.agora.finance/developer/contract-deployments.md).
- How to integrate: it is a plain ERC-20 — `transfer`/`approve` via viem/wagmi works (send path: https://wagmi.sh/react/api/hooks/useSendTransaction). Bonus: AUSD supports ERC-2612 permits and ERC-3009 gasless transfers, so a recipient can submit a transfer the sender only signed (https://docs.agora.finance/developer/advanced-erc-features.md).
- How to mint (real money): Agora's API models mint/redeem as reusable *routes* — e.g. USD wire → AUSD minted to your wallet, or stablecoin → AUSD; route creation returns settlement instructions (wire memo or per-chain deposit address) and each matching inbound transfer settles independently (https://docs.agora.finance/api/endpoints/routes/overview.md). This needs a registered business account — fine for production, out of scope for the demo; use testnet AUSD from the faucet instead.

### Mercuryo — fiat on-ramp widget

- Shape: hosted on-ramp/off-ramp UI embedded via redirect link, iFrame, or mobile WebView; 50+ cryptos across 40+ fiats with card/Apple Pay/Google Pay/local APMs; KYC handled by Mercuryo (SumSub) with light-KYC (no documents) up to €699 (https://widget.docs.mercuryo.io/).
- Integration surface: URL parameters + callbacks/webhooks for status updates; separate production (`exchange.mercuryo.io`) and sandbox (`sandbox-exchange.mrcr.io`) endpoints; off-ramp and spend-card need an integration manager to enable (same page).
- For the hackathon: link out to the widget (redirect = simplest) for "top up with card"; whether it can deliver directly onto Monad is an open question (see §5).

## 3. Architecture options for the three features

Features: (a) top up balance, (b) shareable payment-request link, (c) secure pay-through-link.

### Option A — Direct transfer + offchain signed invoice (RECOMMENDED for 2-week build)

- Requester creates an invoice object `{to, token, amount, nonce, expiry}`, signs it with EIP-712 (`signTypedData`: https://viem.sh/docs/actions/wallet/signTypedData), and encodes `{invoice, signature}` in the link URL.
- Payer opens the link; the app re-computes the signer with `verifyTypedData` (https://viem.sh/docs/utilities/verifyTypedData) and shows "pay X AUSD to 0x…"; payer clicks pay → one `transfer` via wagmi (https://wagmi.sh/react/api/hooks/useSendTransaction).
- Top-up: same direct-transfer path (Mercuryo redirect or plain deposit address + testnet faucet during dev).
- Pros: zero contracts to write/audit; whole flow is viem + wagmi. Cons: no atomicity — payer can ignore the invoice, requester must watch for payment offchain; link itself moves no funds.

### Option B — Escrow contract + claim link

- Requester (or payer) locks funds in a small escrow contract; the link carries an EIP-712 authorization `{escrowId, recipient, amount, nonce, expiry}`; recipient claims onchain, contract verifies signature + expiry + nonce.
- Pros: payment is guaranteed once locked; claim can be recipient-bound so a leaked link is useless to others. Cons: you now own a contract (tests, audit-by-hope, deployment) inside a 2-week window.

### Option C — ERC-3009 gasless receive (`receiveWithAuthorization`)

- Requester signs a 3009 authorization offchain; the link carries it; anyone (payer's client, a relayer) submits it onchain and the transfer executes without the signer holding gas (https://docs.agora.finance/developer/advanced-erc-features.md).
- Pros: requester needs no MON for gas; no custom contract. Cons: only fits "pull" flows (it moves the *signer's* tokens, so it works for payer-authorizes-payout, not requester-demands-payment); still needs a relayer/submitter.

Recommendation: ship Option A. It demos all three features end-to-end with SDK-only code, and the EIP-712 invoice format upgrades cleanly to Option B later (same struct + `verifyingContract` becomes the escrow).

## 4. Security checklist for payment links

- Replay: EIP-712 itself "does not include replay protection" (https://eips.ethereum.org/EIPS/eip-712) — so every invoice MUST carry a sender-scoped `nonce` the app tracks as used, and the domain MUST bind `chainId` (Monad 143 / testnet 10143: https://docs.monad.xyz/guides/mera) so a testnet signature is not valid on mainnet.
- Expiry: include `expiresAt` in the signed struct and enforce it in the UI *and* (Option B) onchain; reject expired links before any signing prompt.
- Amount tampering: amount, token address, and recipient MUST be inside the signed struct — never as unsigned URL params beside the signature; re-verify with `verifyTypedData` on open (EOA path: https://viem.sh/docs/utilities/verifyTypedData; contract wallets need the `publicClient` action on the same page).
- Front-running / link leakage: bind claims to a named recipient address in the signed message; for escrow, first-valid-claim-wins plus recipient check beats commit-reveal at hackathon scale.
- Monad gas quirk: Monad charges the declared `gasLimit`, not gas used — always pass explicit `gas` (e.g. `21_000n` for native transfers) instead of estimates (https://docs.monad.xyz/guides/mera).
- Session hygiene (Mera): `session.end()` zeroes the key — call it on sign-out and idle timeout; prefer prompt-per-transaction for large amounts (https://docs.monad.xyz/guides/mera).

## 5. Open questions / unknowns

1. Does Mercuryo support delivery or purchase of assets directly on Monad (chain id 143), or would top-up land on another chain and need bridging? Not stated on the widget integration page (https://widget.docs.mercuryo.io/).
2. Does Mercuryo list AUSD as a purchasable asset? Not confirmed in the docs read.
3. Dynamic's exact free-tier MAU cap and overage pricing at time of build — the pricing page must be re-checked (https://www.dynamic.xyz/pricing).
4. Production AUSD minting needs an Agora business account + KYC — timeline and eligibility unknown; assumed out of scope for the hackathon (routes API: https://docs.agora.finance/api/endpoints/routes/overview.md).
5. `verifyTypedData` in viem only verifies EOA signatures; smart-wallet/contract-account payers need the `publicClient` variant — confirm which wallet types our chosen provider issues (https://viem.sh/docs/utilities/verifyTypedData).
