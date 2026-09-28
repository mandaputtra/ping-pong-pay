# ADR 0001: Offchain signed invoices, no escrow contract

Date: 2026-09-29. Status: accepted.

## Context
Payment links could settle via escrow contract (funds locked, recipient claims) or direct transfer against an offchain signed invoice.

## Decision
Pay-request links only: requester signs EIP-712 invoice offchain, payer sends one direct AUSD transfer. No custom contract.

## Alternatives
Escrow + claim links (gifts/airdrops). Rejected: custom contract needs tests + expiry/reclaim logic inside a 2-week hackathon window, doubles security surface, not in the 3 requested features.

## Consequences
No contract to audit or deploy. Replay protection (nonce), expiry, and chainId binding enforced in the app, not onchain.
