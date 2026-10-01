# AGENTS.md — ping-pong-pay

## What this is
Easy dollar payments for freelancers on Monad (Metropolis hackathon, Track 02). Payable links,
USDC on Monad testnet, direct wallet-to-wallet transfers, no payment contract. Glossary:
`CONTEXT.md`. Decisions: `docs/adr/`. Research and converted source docs: `docs/`.

## Stack

TanStack Start (SSR) · TanStack Router · TanStack Query · Tailwind v4 · biome · pnpm ·
viem · `@category-labs/mera` (to be replaced by Privy, #12). No Next.js.

- `app/src/routes/` — file-based routes. `__root.tsx` is the document shell.
- `app/src/lib/` — framework-agnostic domain code: `wallet.ts`, `topup.ts`, `relayer.ts`
  (hot-wallet funding), `cap.ts` (per-address + global ceilings), `address.ts` (trust boundary).
- `app/src/components/` — React components.
- `app/src/relayer-server.ts` — standalone Node process for the top-up route.

## Commands (run from `app/`)

```bash
pnpm dev            # dev server on :3101
pnpm build          # SSR build
pnpm start          # serve the built app
pnpm test           # vitest
pnpm typecheck      # tsc --noEmit
pnpm check          # biome lint + format
pnpm generate-routes # tsr generate — run after adding or moving a route file
pnpm relayer        # top-up service on :8791
```

## Scaffolding

The app was generated with the TanStack CLI, run in a scratch directory and merged in:

```bash
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind --toolchain biome --add-ons tanstack-query
```

Follow-up TanStack Intent commands:

```bash
npx @tanstack/intent@latest install   # needs an interactive terminal for permissions
npx @tanstack/intent@latest list
npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes
```

**Consult Intent before any TanStack-specific change** — the shipped skills are more current
than this file. Example:
`npx @tanstack/intent@latest load @tanstack/router-plugin#router-plugin`.

## Environment

`.env` lives at the **repo root**, one level above this package. Vite is configured with
`envDir: ".."` to find it. `.env` is gitignored; only `.env.example` is committed.

| Variable | Where | Purpose |
|---|---|---|
| `PRIVY_APP_ID` | client | Privy project identifier |
| `PRIVY_API_KEY` | client | Privy key — never expose via a `VITE_` prefix |
| `RELAYER_PRIVATE_KEY` | **relayer only** | Hot wallet funding top-ups. Never reaches the browser. |
| `VITE_RELAYER_URL` | client | Relayer base URL, defaults to `http://localhost:8791` |

## Monad gotchas

- Testnet chain 10143, mainnet 143. USDC on testnet: `0x534b2f3A21130d7a60830c2Df862319e593943A3`.
- **Monad charges the declared `gasLimit`, not gas used.** Always pass an explicit `gas`
  value; never let an estimate stand.
- Monad rejects zero-balance senders (`Signer had insufficient balance`), which is why the
  relayer exists — see `docs/gas-for-new-wallets.md`.

## Architecture decisions

- **No payment contract** (ADR-0001). Direct USDC transfer; the invoice is an off-chain signed
  intent `{to, amount, nonce, expiry}` verified with EIP-712 before any signing prompt.
- **The relayer is a separate service, not an in-process route.** TanStack Start 1.168.59 has
  no server-route API — the documented `server: { handlers }` option is not in the published
  version. Revisit when `@tanstack/react-start` ships it; the CORS boundary already exists.
- **The cap slot is reserved synchronously** before the transfer, so concurrent requests for
  one address cannot both pass the check.

## Gotchas

- Mera and Privy are client-only. Wallet code touches `window`/`localStorage`, so it must not
  run during server render. Keep it inside event handlers.
- `.tanstack/` and `routeTree.gen.ts` are generated — never hand-edit the route tree.
- `dist/server/server.js` is a bundle, not a runnable entry on its own; use `pnpm start`.

## Next steps

- #12 Privy migration — unblocks the wallet layer and the $5k Privy bounty.
- #14 create + share payment request, then #15 guest pay.
- #10 T&C compliance: AI-tool disclosure, registration, demo video.
