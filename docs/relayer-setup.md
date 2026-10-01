# Relayer setup (Monad testnet, AUSD)

Why this exists: Monad rejects zero-balance senders — a fresh Mera wallet holding 0 MON
gets `Signer had insufficient balance` on `eth_sendRawTransaction`, verified live. So no
client wallet can pay its own gas. The relayer holds a funded hot wallet and pays both the
gas and the AUSD, so the user never needs MON and never sees the word.

The Agora AUSD faucet on Monad testnet is currently drained (`requestFunds` reverts
`0x356680b7` = `InsufficientFunds()`; the faucet holds 0.000001 AUSD), so the relayer funds
top-ups from its own inventory. See `docs/gas-for-new-wallets.md`.

## Run it

```bash
export RELAYER_PRIVATE_KEY=0x...   # hot wallet, testnet only
export PORT=8791                   # 8787 was taken locally; any free port works
npm run --prefix app relayer
```

Client points at it with `VITE_RELAYER_URL` (defaults to `http://localhost:8787`).

## Funding the hot wallet (external, still open)

The relayer needs AUSD on Monad testnet, and there is currently no free source:
- Agora AUSD faucet, Monad testnet — **drained**
- Testnet bridges — none exist (Monad's documented bridges are mainnet-only)
- Sepolia AUSD faucet — funded, but nothing bridges it to Monad

Ask Agora or Monad Foundation in Discord for a testnet mint or faucet refill. Until then
`POST /topup` returns `503 out of stock` and the UI says so honestly.

## Limits

- 2 USDC per top-up, 6 USDC per address, 100,000 USDC global ceiling.
- The per-address ledger is in-memory and resets on restart. Before this is publicly
  reachable, move it to a real store and add per-IP limiting — addresses are free to
  generate, so the per-address cap alone is not an abuse limit.
