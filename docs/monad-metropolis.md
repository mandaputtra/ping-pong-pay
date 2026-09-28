# Monad + Metropolis — research notes

All facts from primary sources only (docs.monad.xyz, monad.xyz, hackathon.monad.xyz).
Each claim carries its inline source URL. Read 2026-09-28; re-check before submitting.

## 1. Chain essentials

| | Mainnet | Testnet |
|---|---|---|
| Network name | `Monad Mainnet` (https://docs.monad.xyz/developer-essentials/network-information) | `Monad Testnet` (https://docs.monad.xyz/developer-essentials/testnet) |
| Chain ID | `143` (https://docs.monad.xyz/developer-essentials/network-information) | `10143` (https://docs.monad.xyz/developer-essentials/testnet) |
| Currency | `MON` (https://docs.monad.xyz/developer-essentials/network-information) | `MON` (https://docs.monad.xyz/developer-essentials/testnet) |
| Primary RPC | `https://rpc.monad.xyz` + `wss://rpc.monad.xyz` (QuickNode, 25 rps, batch 100) (https://docs.monad.xyz/developer-essentials/network-information) | `https://testnet-rpc.monad.xyz` + `wss://testnet-rpc.monad.xyz` (QuickNode, 50 rps, batch 100) (https://docs.monad.xyz/developer-essentials/testnet) |
| Alt RPCs | `https://rpc1.monad.xyz` (Alchemy, 15 rps, no `debug_`/`trace_`); `https://rpc2.monad.xyz` (Goldsky Edge); `https://rpc3.monad.xyz` (Ankr, no `debug_`); `https://rpc-mainnet.monadinfra.com` (MF, 20 rps) (https://docs.monad.xyz/developer-essentials/network-information) | `https://rpc.ankr.com/monad_testnet` (Ankr, no `debug_*`); `https://rpc-testnet.monadinfra.com` (Monad Foundation, 20 rps) (https://docs.monad.xyz/developer-essentials/testnet) |
| Explorers | https://monadvision.com and https://monadscan.com (https://docs.monad.xyz/developer-essentials/network-information) | https://testnet.monadvision.com and https://testnet.monadscan.com (https://docs.monad.xyz/developer-essentials/testnet) |
| Faucet | n/a (mainnet needs real MON) | https://faucet.monad.xyz; app hub https://testnet.monad.xyz (https://docs.monad.xyz/developer-essentials/testnet) |

EVM compatibility: Monad is bytecode-compatible with Ethereum at the Fusaka fork — all opcodes supported, full Ethereum RPC compatibility, same 20-byte ECDSA address space, works with MetaMask by just changing RPC URL + chain ID (https://docs.monad.xyz/introduction/monad-for-developers). Performance: ~10,000 TPS design capacity, 300 ms blocks, 600 ms full finality (https://docs.monad.xyz/ai/current-facts).

Monad-specific differences that bite (vs vanilla EVM), all from https://docs.monad.xyz/developer-essentials/differences:
- **Charged on gas LIMIT, not gas used** — `value + gas_price * gas_limit` is deducted. Always pass an explicit `gas` value (e.g. `21_000n` for a native transfer), never let an estimate stand (https://docs.monad.xyz/guides/mera).
- Max contract size 128 KB (vs 24.5 KB); max init code 256 KB.
- EIP-4844 blob transactions (type 3) NOT supported; types 0/1/2/7702 are.
- P256/WebAuthn verification precompile at `0x0100` (EIP-7951) — this is what makes passkey wallets (Mera) cheap onchain.
- No global mempool (local mempools, tx forwarded to next 3 leaders); full nodes don't serve arbitrary historic state.

## 2. Contract dev path on Monad

Vanilla EVM workflow — nothing Monad-specific except config flags:
- **Foundry v1.8.0+** with the Monad execution network enabled: `forge init --template monad-developers/foundry-monad`, set `network = "monad"` in `foundry.toml`, `eth-rpc-url = "https://testnet-rpc.monad.xyz"`, `chain_id = 10143` (https://docs.monad.xyz/guides/deploy-smart-contract/foundry). Template: https://github.com/monad-developers/foundry-monad.
- **Hardhat 2 or 3**: templates `monad-developers/hardhat-monad` / `hardhat3-monad`; deploy via `npx hardhat ignition deploy … --network monadTestnet`. MUST set `evmVersion: "osaka"` in Solidity compiler settings (https://docs.monad.xyz/guides/deploy-smart-contract/hardhat).
- **viem >= 2.40.0** supported; `monad` (143) and `monadTestnet` (10143) ship in `viem/chains` (https://docs.monad.xyz/developer-essentials/summary, https://docs.monad.xyz/guides/mera). wagmi builds on viem chains, so standard wagmi + viem frontend stack applies [INFERENCE — not separately confirmed in docs].
- Verify on MonadVision after deploy: Foundry and Hardhat verify guides at https://docs.monad.xyz/guides/deploy-smart-contract/foundry and https://docs.monad.xyz/guides/deploy-smart-contract/hardhat (see "Next Steps"/"Verify" links).

## 3. Metropolis facts

Source for this section unless noted: https://monad.xyz/developers/hackathons/metropolis.
- **Build window:** 1 Sep → 13 Oct 2026 (six weeks, online global; registration opened 1 Sep, build starts same day).
- **Submission deadline:** 13 Oct. Judging 14–27 Oct. Winners announced 3 Nov.
- **Prize pool:** $250,000+ total.
- **Consumer Products & Payments track (ours):** $30,000 split evenly between 3 teams ($10k each). Best fit: "product teams who care more about a user's first five minutes than the architecture underneath." Judge-signal examples: a payments app that never mentions blockchain; subscriptions charging by the second; shared wallets/group spending settling without an intermediary. (ping-pong-pay hits example 1 and 3 directly.)
- **Grand Champion:** $25,000, picked across all four tracks (other tracks: Onchain Finance & Trading, Social/Attention/Culture, Trust/Identity/AI Infra — $30k each, same 3-team split).
- **After the hackathon:** top teams get ecosystem support + invite to a residency program alongside other top teams on Monad.
- **Submission requirements/checklist:** portal is login-gated (GitHub/Google/Discord sign-in at https://hackathon.monad.xyz); its public page describes only "register, form a team, and ship a project… tracks, bounties, milestones, and final submission." Exact submission checklist (repo, demo video, deployment proof) is behind login — see Open questions.

## 4. Payments-relevant sponsor bounties

All from https://monad.xyz/developers/hackathons/metropolis ("Sponsor prizes — bounties and perks for every team in the build"; full details on the platform):
- **Agora — Best Cross-Border Payments App on Monad: $10,000** (https://www.agora.finance/). Direct fit for payment links. (Agora also offers $10,000 Best Mobile Trading App — less relevant.)
- **Dynamic — Best Use of Dynamic: $5,000** (https://www.dynamic.xyz/). Embedded wallets (passkey/email/social/SMS sign-in; TEE + TSS-MPC) per https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets.
- **Privy — $5,000** (https://www.privy.io/). Embedded wallets + server wallets + server-delegated actions; passkey/social/email/SMS auth (https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets).
- **Mercuryo — $10,000**, listed as "product credits and integration support for winning teams" (https://www.mercuryo.io/). Full bounty criteria on the platform (login-gated).
- **Monad Foundation — Best Mera-Powered UX on Monad: $2,500**, and **Mera: One Passkey, Many Keys: $2,500** (https://monad.xyz/). Mera = passkey-derived self-custodial BIP-44 EOAs, no seed phrase, no bundler/MPC service; web guide https://docs.monad.xyz/guides/mera, React Native guide https://docs.monad.xyz/guides/mera/react-native, package `@category-labs/mera`.
- **MetaMask — Best Agent Wallet Plugin: $2,500** (https://metamask.io/).

Strategy note: Dynamic/Privy/Mera bounties all reward "use our wallet infra" — we only need one wallet story; Mera's two $2.5k bounties + native passkey angle stack best with the invisible-blockchain track narrative, Dynamic/Privy are fallbacks.

## 5. Free participant tooling

From https://monad.xyz/developers/hackathons/metropolis:
- **Quicknode:** 3 months Build plan free for every team (https://www.quicknode.com/) — use as primary RPC (higher limits than public endpoints).
- **Tenderly:** Pro access — free license to simulate, debug, monitor (https://tenderly.co/). Docs list Tenderly as supported infra (https://docs.monad.xyz/developer-essentials/summary).
- **Zerion:** 1 month API Builder tier — wallet data across 50+ chains (https://zerion.io/api/).
- **Dwellir:** 3 months Developer plan free for all participants (https://www.dwellir.com/) — backup RPC.
- **Spectrum Nodes:** 2 months Business plan free for every team (https://spectrumnodes.com/) — backup RPC.
- Winners-only (for awareness, not build-time): ack3 security scan for every winning team (https://ack3.ai/); Chainstack annual Pro plans for Track 01 + overall winner; Crouton Digital 3 months unlimited RPC for winning teams; Mercuryo credits/support; Zerion 3 months Builder for all winners; Envio Cloud hosting for winning teams; Envio $1,000 Best Use bounty; Alchemy $1,000 in credits for best projects using Alchemy.

Worth using for ping-pong-pay: QuickNode RPC + Tenderly (simulate top-up/pay flows, debug reverts) from day one; Zerion API only if we need cross-chain balance display (probably skip — YAGNI).

## 6. Open questions / unknowns

1. Exact submission checklist (repo link? demo video length? testnet vs mainnet deployment required? milestone check-ins?) — behind login at https://hackathon.monad.xyz; must read after registering.
2. Full bounty criteria text for Agora cross-border, Mercuryo, Dynamic, Privy, Mera, MetaMask — "listed in full on the platform" (https://monad.xyz/developers/hackathons/metropolis); must read after registering.
3. Whether payment-link contracts must deploy to mainnet or testnet suffices for judging — unconfirmed; assume testnet OK until platform says otherwise.
4. Mainnet MON acquisition path for post-hackathon launch (bridges/onramps) — tokens-and-bridges page https://docs.monad.xyz/developer-essentials/network-information/tokens-and-bridges not yet read.
5. wagmi-specific Monad guidance — viem support confirmed (https://docs.monad.xyz/developer-essentials/summary), wagmi inferred via viem chains; verify with a smoke test if we use it.
