# Can a zero-MON wallet top itself up?

**Short answer: no — not by itself, and not today.** A brand-new Mera wallet is a plain
EOA with 0 MON, and a 0-MON EOA cannot put *any* transaction on Monad, including the
AUSD faucet call. The blocker is the chain, not the faucet. Separately, the AUSD faucet
contract is **currently drained** and reverts for everyone. The minimum practical setup
is a small server-side relayer wallet holding MON (and AUSD) on the user's behalf.

Everything below is from primary sources: Monad's docs, verified contract source on
Monadscan, and live calls against `https://testnet-rpc.monad.xyz` (chain ID 10143).

---

## 1. The hard blocker: a 0-MON EOA cannot send a transaction

Monad's **Reserve Balance** mechanism sets a `user_reserve_balance` of **10 MON** per
EOA. At consensus time, for an undelegated account with no inflight transactions, a new
transaction is only includable when:

$$
\text{gas\_fees}(tx) \leq \min(\text{user\_reserve\_balance},\ \text{balance})
$$

With `balance = 0`, the budget is `min(10, 0) = 0`, so `gas_fees ≤ 0` — no transaction
qualifies. The Reserve Balance doc is explicit that "EOAs with balances below
`user_reserve_balance` won't be able to send any successful transactions"
([reserve-balance.md](https://docs.monad.xyz/developer-essentials/reserve-balance.md)).

**Verified live, not inferred.** A freshly generated key with a 0 balance, signing an
EIP-1559 self-transfer of 21,000 gas at 105 Gwei, submitted via `eth_sendRawTransaction`:

```
eth_sendRawTransaction -> {"jsonrpc":"2.0","error":{"code":-32000,
  "message":"Signer had insufficient balance"},"id":1}
```

The node rejects it at admission. This is a hard stop, not a simulation artifact.

The *emptying exception* does not rescue us: it only lets an account dip below 10 MON
when the transaction is the sender's first in `k = 3` blocks and the account is
undelegated — it waives the **10 MON** floor, not the requirement to have balance at
all ([reserve-balance.md](https://docs.monad.xyz/developer-essentials/reserve-balance.md#addressing-the-drawback)).

### The way out: someone else pays

Monad supports **EIP-7702**, and its docs call out our exact case by name:

> "The EOA can sign an 'authorization tuple' which can then be used by the sponsoring
> entity to send the transaction. This will allow EOAs to behave like smart contracts
> without any funds for gas!"
> — [eip-7702.md](https://docs.monad.xyz/developer-essentials/eip-7702.md)

And, on the Reserve Balance interaction:

> "For example, a delegated EOA *A* with a balance of 5 MON can still be called by a gas
> sponsor, and the transaction will succeed as long as *A* ends with 5 MON or more still."
> — [eip-7702.md](https://docs.monad.xyz/developer-essentials/eip-7702.md#delegated-eoas-can%E2%80%99t-dip-below-10-mon)

> "Many sponsored gas workflows have users set up EIP-7702-delegated EOAs that don't
> interact with MON at all (i.e. they start out empty, and only receive MON
> involuntarily). Under a typical such workflow, a sponsor submits a transaction that
> calls into the EOA as smart contract. This workflow works fine in Monad; it's fine for
> the EOA in question to have a zero or very small balance."
> — [reserve-balance.md](https://docs.monad.xyz/developer-essentials/reserve-balance.md#eip-7702-delegated-accounts)

The one case where this breaks: if sponsored code tries to move MON *out* of a delegated
EOA whose balance is under 10 MON, execution reverts. **Receiving AUSD is unaffected** —
AUSD is an ERC-20, not MON, so a drip into a zero-balance delegated wallet leaves the
MON balance unchanged, which the protocol explicitly permits ("transactions where the
EOA's balance is unchanged or increases are fine").

Monad testnet also deploys EntryPoint v0.6/0.7/0.8/0.9, so ERC-4337 bundlers work
([testnet.md](https://docs.monad.xyz/developer-essentials/testnet#canonical-contracts)).

---

## 2. What the AUSD faucet actually is

**`0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` is a transparent proxy, not a 1200-byte
faucet.** Verified on Monadscan: contract name `AgoraTransparentUpgradeableProxy`,
implementation `0xba804DF5c476E8EaeF87BF8085F295300ccE2a49`, which is `AgoraFaucet`
(Solidity 0.8.28, cancun). Confirmed live: the EIP-1967 slot
`0x360894...382bbc` on the proxy holds `0xba804df5c476e8eaef87bf8085f295300cce2a49`
([Monadscan](https://testnet.monadscan.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C#code)).

This is Agora's standard cross-chain faucet address — the *same* address is listed for
Sepolia, Base, Arbitrum, Optimism, Polygon Amoy, Katana and Monad testnets
([Agora contract deployments](https://docs.agora.finance/developer/contract-deployments)).
Deploying it is not in our control.

### Full ABI of the implementation (`AgoraFaucet`)

| Function | Mutability |
| --- | --- |
| `requestFunds(address _receiver)` | **nonpayable** |
| `initialize(tuple)` | nonpayable |
| `token()` → `address` | view |
| `faucetDripAmount()` → `uint256` | view |
| `maxAmountToOwn()` → `uint256` | view |
| `maxDripFrequency()` → `uint256` | view |
| `lastDripTimestamp()` → `uint256` | view |
| `version()` → `(uint256,uint256,uint256)` | pure |
| `AGORA_FAUCET_STORAGE_SLOT()` → `bytes32` | view |

Events: `FundsRequested(address indexed receiver, uint256 amount)`, `Initialized`,
`SetLastDripTime`, `configureFaucet`.
Errors: `InsufficientFunds()`, `MaxAllowedExceeded()`, `MaxFrequencyExceeded()`,
`InvalidInitialization()`, `NotInitializing()`, `SafeERC20FailedOperation(address)`.
([Monadscan — implementation](https://testnet.monadscan.com/address/0xba804DF5c476E8EaeF87BF8085F295300ccE2a49#code))

### Is it gas-sponsored or payable? No.

- **`requestFunds` is `nonpayable`.** There is **no `receive()` and no payable fallback
  on the implementation.** The only payable entry point on the *proxy* is its
  `payable fallback`, which is just the standard EIP-1967 delegate dispatch — sending
  MON to the proxy does nothing for the caller.
- **No sponsorship hooks.** No `isTrustedForwarder`, no ERC-4337 `validatePaymasterUserOp`,
  no meta-transaction `execute`/`executeMetaTransaction`. Nothing in the ABI lets a
  third party pay for someone else's `requestFunds` call at the protocol level.
- The contract is a plain `SafeERC20` holder: it checks its own balance and cooldown, then
  `safeTransfer`s AUSD to `_receiver`. The **sender** pays gas; the **receiver** is just
  an argument.

**The critical design detail: `requestFunds(address _receiver)` takes the recipient as a
parameter.** Nothing requires the caller to be the recipient. A funded relayer can call
`requestFunds(anyUserAddress)` and the AUSD lands in the user's wallet. The user needs an
address — which Mera gives them — and does **not** need to sign anything for the top-up.

### Live parameters (read via `eth_call`)

| Parameter | Value |
| --- | --- |
| `token()` | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` (AUSD) |
| `faucetDripAmount()` | `10000000000` = **10,000 AUSD** (AUSD has 6 decimals) |
| `maxAmountToOwn()` | `100000000000` = **100,000 AUSD** per address |
| `maxDripFrequency()` | `60` seconds |

AUSD decimals = 6, confirmed by `decimals()` returning `6` — the repo's
`app/src/topup.ts` correctly hardcodes `gas: 100_000n`, but any AUSD amount math must
use 6 decimals, not 18.

The **cooldown is per-receiver, not global.** Two `requestFunds` transactions from the
same sender, `0xBa50EB67…`, succeeded in blocks
[65125295](https://testnet.monadscan.com/tx/0x1837d6f86ca0bfa10cd17bef821219dd518aee54093f669321fb9f49f86fa5e5)
and
[65125300](https://testnet.monadscan.com/tx/0xf486e70ef02327a99873a3ce5640ccc135aecedb7ad34056bf13017d0c24848e)
— 5 blocks (~1.5 s) apart, both against a 60 s limit. A single global timestamp could
not admit both. So one relayer can serve many distinct users back to back; only repeated
drips *to the same address* are throttled.

### Gas cost of a drip

Observed: **0.013713 MON** for a 130,600 gas limit at 105 Gwei
([tx](https://testnet.monadscan.com/tx/0xf18a559fc5889bff604d88189187efd9025b3b324b2acfde87f17f26aa328855)).
Monad charges the **declared `gasLimit`, not gas used**, so over-estimating is charged in
full ([gas-pricing.md](https://docs.monad.xyz/developer-essentials/gas-pricing#gas-limit-not-gas-used)).
Set the gas limit tightly; the existing `100_000n` in `app/src/topup.ts` is reasonable.

---

## 3. The faucet is drained right now

`requestFunds` reverts for **everyone**, including funded callers. Simulating from a
recently-active funded address against a fresh recipient:

```
SIM requestFunds(fresh) REVERT -> 0x356680b7
```

`0x356680b7` = `InsufficientFunds()` (computed via `toFunctionSelector` over the ABI
above). The cause: the faucet holds **1 raw unit** of AUSD — `0.000001 AUSD` — while
`faucetDripAmount` is 10,000 AUSD. Its MON balance is 0. The contract is
[empty on Monadscan](https://testnet.monadscan.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C)
("Balance: $0"). Last successful drip was 3 days ago; the most recent transactions on the
faucet are from 5–8 days ago.

AUSD itself is healthy — `totalSupply` 302,010,000, 3,119 transactions, transfers an hour
ago ([AUSD on Monadscan](https://testnet.monadscan.com/token/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC)).
Only the faucet is empty. **This is Agora's to refill and is outside our control**; it is
a live-demo risk we must not depend on.

---

## 4. Is `faucet.monad.xyz` automatable? No

Every endpoint, including the root, returns HTTP 429 with a bot-challenge body:

```
HTTP 429 {"error":{"code":"challenge",
  "message":"This request requires a challenge to be completed.","id":"sin1::…"}}
```

Probed: `/`, `/api/claim`, `/api/faucet/claim`, `/api/drip`, `/api/health`, `/api`. No
unauthenticated programmatic endpoint was found, and no captcha/login-free API is
documented anywhere in [docs.monad.xyz](https://docs.monad.xyz/developer-essentials/testnet).
**The MON faucet is a browser flow with a bot challenge, and it hands out MON — not AUSD
anyway.** It is not a viable backend dependency for a demo.

---

## 5. Gasless options that actually exist

### ERC-4337 paymasters / bundlers on Monad testnet

Monad's own docs list, all marked supported on testnet: Alchemy (Gas Manager), Biconomy,
FastLane, Gelato, Openfort, Pimlico, Sequence, thirdweb, ZeroDev
([account-abstraction.md](https://docs.monad.xyz/tooling-and-infra/wallet-infra/account-abstraction)).
Monad ships first-party **sponsored transactions templates** using Privy + Pimlico
Kernel/EntryPoint v7 smart accounts
([Next.js template](https://docs.monad.xyz/templates/next-serwist-privy-smart-wallet),
[React Native template](https://docs.monad.xyz/templates/react-native-privy-pimlico-sponsored-transactions)).

Note these give a *different* account type (a smart account), not a Mera passkey EOA. A
Mera wallet cannot retroactively become a Privy smart account.

### ERC-3009 on AUSD — the cleanest fit

AUSD's verified ABI exposes **ERC-3009 gasless transfers**:
`transferWithAuthorization(...)` and `receiveWithAuthorization(...)`, in both
`bytes` and `(v,r,s)` signature forms, plus `AuthorizationUsed` / `AuthorizationCanceled`
events and `UsedOrCanceledAuthorization` / `ExpiredAuthorization` / `InvalidSignature`
errors ([AUSD on Monadscan](https://testnet.monadscan.com/address/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC#code)).
Agora documents this as "allowing transactions to be executed without requiring the
sender to hold Ether for gas fees"
([advanced-erc-features.md](https://docs.agora.finance/developer/advanced-erc-features)).

This is a genuine gasless path for **AUSD transfers** — the sender signs off-chain, a
relayer submits. It does **not** help mint the first AUSD, because the mint path is a
contract call, not a token transfer.

### Hackathon-era sponsorship

The Metropolis hackathon (1 Sep – 13 Oct 2026, $250,000+; Agora sponsors a $10,000
"Best Cross-Border Payments App on Monad" bounty) lists free tooling for every team,
including QuickNode, Tenderly, Dwellir and RPC credits
([metropolis](https://monad.xyz/developers/hackathons/metropolis)). Third-party reporting
says Monad has passed 1M gasless transactions via MetaMask's gas-sponsorship integration
— **secondary source, unverified against Monad docs**, and the claim that it applies to
users holding "at least 10 MON tokens" would defeat our purpose if true. Treat as
unconfirmed.

---

## Answer

**Can a zero-MON wallet call the AUSD faucet? No.** A 0-MON EOA is rejected at
`eth_sendRawTransaction` with "Signer had insufficient balance", because Monad's
Reserve Balance gives a 0-balance account a gas budget of `min(10, 0) = 0`. And even a
funded wallet gets nothing today, because the faucet contract holds 0.000001 AUSD and
reverts `InsufficientFunds()`.

**Minimum practical setup for a live demo:** one server-side hot wallet funded with
~1–2 MON and ~10,000 AUSD, which calls `requestFunds(userAddress)` (or transfers AUSD
directly) on the user's behalf. The user signs nothing; they only need an address, which
Mera already gives them. This is ~15 lines of backend code and no new dependencies.

---

## Ranked options

| # | Option | Effort | Hackathon-viability |
| --- | --- | --- | --- |
| 1 | **Relayer transfers AUSD from its own inventory** — `transfer(receiver, 10_000e6)` | ~30 lines, no deps | **Highest.** Works today, independent of Agora. Only cost is gas (~0.0077 MON/tx). |
| 2 | **Relayer calls `requestFunds(userAddress)`** | ~30 lines, no deps | **High architecturally, currently blocked.** The one-click flow is exactly right — the faucet already takes a receiver argument. Fails today with `InsufficientFunds()`; works the moment Agora refills. Ship behind a fallback to #1. |
| 3 | **Point users at `faucet.monad.xyz` in the browser** | Hours (copy only) | **Low.** Bot-challenged, manual, browser-only, and gives MON not AUSD. Unusable for a payer who then needs to send AUSD. |
| 4 | **ERC-4337 paymaster (Pimlico / Gelato / Alchemy / thirdweb)** | Days | **Medium.** Works, but replaces the Mera passkey EOA with a smart account — conflicts with our no-custom-account design ([payments-stack.md](payments-stack.md), [ADR 0001](adr/0001-offchain-invoices-no-escrow.md)). |
| 5 | **EIP-7702 delegation to a sponsor relayer** | Days | **Medium.** Monad's docs bless this exact zero-balance sponsored flow, and it also solves the *payment* leg. But it needs a 7702 delegation design and a relayer contract — significant scope for a top-up. |
| 6 | **ERC-3009 gasless AUSD transfer** | ~1 day | **Medium, and it is the right answer for the wrong problem.** Real gasless path, but it moves AUSD that already exists; it cannot mint the first 10,000. Keep as the follow-on for the pay leg. |

---

## Recommendation

**Build option 1, structured so option 2 drops in behind it.**

- Add a `POST /api/topup` route on the existing app server. It takes a user address,
  checks it server-side, and sends from a funded hot wallet. Cap it at 10,000 AUSD per
  address (matching the faucet's own `maxAmountToOwn`) so a compromised endpoint cannot
  drain the hot wallet. Never expose the key client-side.
- Try `requestFunds(userAddress)` first; on `InsufficientFunds()` (`0x356680b7`), fall back
  to a direct AUSD `transfer`. Both paths are one call with the same arguments, so this is
  a small branch, not two systems — and it self-heals when Agora refills the faucet.
- **Remember AUSD has 6 decimals.** `10_000_000_000n`, not `parseEther("10000")`.
- Do **not** add 4337/7702 infrastructure for the top-up. It does not pay for itself in a
  two-week build, and option 1 removes the problem entirely.

### Do this in dev, document for judges

**In dev — the parts that must really work:**
- The funded hot wallet, the server route, the per-address cap, the fallback branch.
- AUSD amount math in 6 decimals.
- Tight explicit `gas` on every call (Monad charges `gasLimit`, not gas used).
- An honest error line when the hot wallet is empty — `app/src/topup.ts`'s `friendlyError`
  already covers this pattern, but the "need MON" copy is now wrong: users never need MON,
  the demo's hot wallet does.

**For judges — document, don't build:**
- **The gasless story is the pitch, not the plumbing.** Show the zero-MON Mera wallet, show
  the one-click top-up, show the payment landing. Never mention a relayer in the UI. The
  whole point of the Consumer Products & Payments track is "a payments app that never
  mentions a blockchain to the person using it"
  ([Metropolis track brief](https://monad.xyz/developers/hackathons/metropolis)) — the
  sponsor paying gas is infrastructure, exactly like a payment processor absorbing fees.
- **Have the EIP-7702 answer ready for the Q&A.** "How do new users pay without gas?" is
  a certain judge question. The answer: Monad's docs state a delegated EOA with zero or
  small balance works fine under a sponsor, and AUSD's ERC-3009
  `transferWithAuthorization` lets a payer sign a transfer that a relayer submits with
  no MON at all. Both are cited above. That is a strong, honest, on-chain answer.
- **Mention the funded-wallet model in the README**, in one line, with the cost. It reads
  as competence, and it is true: sponsors paying gas is how consumer crypto actually ships.

**Do not demo:** the Agora faucet as the primary path. It is drained, it is a shared
third-party contract, and its availability is outside our control. Keep it wired as the
preferred path, but demo the fallback.
