# ADR 0001: Payment Flow Design

## Context
Existing crypto payment flows require wallets, seed phrases, and chain knowledge. We need a frictionless way for users to request and settle small dollar amounts onchain.

## Decision
Use EIP-712 typed data for offchain invoices with:
- Direct AUSD transfer settlement
- Sender-scoped nonce protection
- Expiry enforcement
- ChainId binding

## Consequences
- **Pros**: No custom contracts, simple UX, replay protection
- **Cons**: Offchain verification required, no escrow

## Implementation
1. **Invoice Structure**: `{ to, amount, nonce, expiry }`
2. **Signature**: EIP-712 signed by requester
3. **Guest Flow**: Payer verifies invoice before signing
4. **Settlement**: Direct AUSD transfer via wagmi

## Security
- Nonce store prevents replay
- Expiry checked pre-prompt
- Domain binds chainId

## Alternatives
- Custom contract: Overkill for simple payments
- Onchain metadata: Expensive gas
- Centralized escrow: Not self-custodial