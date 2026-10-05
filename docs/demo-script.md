# Demo video script — 3:00 cap

One take, no narration over the whole thing. Record at 1920×1080. **Rehearse the timing
before recording** — the payment beat is real and can be slow on a cold RPC.

## Before you record

- Relayer funded: testnet MON for gas, testnet USDC for inventory
  (`0xF1b291D8dcdaa2c3041c46707a066100d800F964`).
- Both wallets holding testnet USDC. The payer's wallet is the one you pay **from**.
- Clear the browser nonce ledger so the payment you are about to make is genuinely new.
- `pnpm dev` and `pnpm relayer` already running. Tab already signed in as the freelancer.
- Pause the RPC-dependent beats rather than narrating over silence.

## The three minutes

### 0:00–0:20 — The problem (20s)

> "A freelancer bills a client. The client pays with an app they already have, in under a
> minute. No account, no seed phrase, no conversation about onboarding."

Nothing on screen but the title card. Do not demo anything yet.

### 0:20–0:55 — Create the request (35s)

Signed in as the freelancer.

1. Home shows the balance in dollars — **no crypto decimals**.
2. Enter `25.00` and a description: *"Brand refresh — October"*.
3. Click **Create link**. The wallet signs; the link appears.
4. Click **Copy link**. The button confirms **Copied**.

> "The freelancer signs a request for exactly this amount. The amount is inside what they
> signed, so changing it in the link makes the request invalid — not just different."

### 0:55–1:10 — The link is the product (15s)

Show the link as text, then open it. Hold on the pay screen.

> "This is what the client sees. Who is asking, how much, and why — before any account
> exists."

**The client opens this in a private window.** No session. That is the point.

### 1:10–2:05 — Pay, once (55s)

1. Guest taps **Get started**, signs in. The wallet is created inline — do not skip this,
   it is the least believed claim in the demo.
2. One button: **Pay $25.00**. Tap it. **One confirmation.** No gas prompt, no second screen.
3. Pending: *"Finishing your payment… This takes a second."*
4. Receipt: **Paid · $25.00 · Sent to `0x…` · time · View on MonadScan**.

> "One tap. One confirmation. No gas prompt, no seed phrase, and the money moves directly to
> the freelancer — there is no contract holding it."

Then **cut back to the freelancer's home screen**. The balance has moved and the payment is
in the activity list. This cut is the payoff; do not skip it.

### 2:05–2:30 — It cannot be double-paid (25s)

Reload the same payment link.

> "Reopening the same link shows the receipt, not a second payment."

Then open a tampered link — one character of the amount changed:

> "And if the amount in the link is changed at all, the request stops matching the
> freelancer's signature and the app refuses to let anyone pay it."

On screen: *"Don't pay this one."*

### 2:30–2:50 — Honest limits (20s)

> "Two things I want to be straight about. The app reads transfers from the last hundred
> blocks — Monad's public RPC refuses wider queries — so activity history is about thirty
> seconds deep, not forever. Same limit bounds the replay check across browsers. And cash
> out is a simulation: no bank is connected and nothing moves."

**Do not cut this.** Naming the ceiling is worth more than hiding it.

### 2:50–3:00 — Close (10s)

Card: **Ping Pong Pay — approved. Paid.** Link to the repo.

## Hard rules

- The payment must be real and land on-chain. No mocks, no cuts mid-payment.
- Do not say "gas", "nonce", "EIP-712", "escrow", or "seed phrase" as a requirement. The
  screen text is the source of truth for what the product claims.
- Show the receipt and the freelancer's updated balance. Those two shots are the proof.
- If the payment is slow, hold the pending frame — do not edit around it.

## Shot checklist

| Shot | Timestamp |
|---|---|
| Balance in dollars, no crypto decimals | 0:22 |
| Description carried into the link | 0:35 |
| Guest pay screen before any account | 0:58 |
| Wallet created inline during pay | 1:15 |
| **Single** confirmation, no gas prompt | 1:30 |
| Pending state | 1:38 |
| Receipt with explorer link | 1:48 |
| Freelancer's balance moved + activity list | 2:00 |
| Reloaded link shows receipt, no second charge | 2:12 |
| Tampered link refused | 2:22 |