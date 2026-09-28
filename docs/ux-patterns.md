# UX Patterns — making a payment feel instant and chain-free

How mature payment products handle the two moments that decide whether a stranger pays you: **payer opens a link** and **payer pays**. Every claim cites its primary source inline; nothing here is invented. Products studied: Stripe (hosted checkout + Payment Links), Zelle, BLIK, Mercado Pago (QR + Checkout Pro), Coinbase Onramp (CDP), Base payments.

Context: ping-pong-pay pays AUSD on Monad, guests pay through a link with no signup, wallet is a Mera passkey EOA, no custom contracts (see `docs/payments-stack.md` §3 Option A, `CONTEXT.md`). Currency shown to users is dollars; the token symbol is an implementation detail.

---

## 1. Link-open → pay sequence

### What the apps do

**A link is a *product page*, not a redirect.** Stripe: you "share payment links with your customers and Stripe redirects them to a Stripe-hosted payment page" (https://docs.stripe.com/payment-links/create). The amount, title, description and image travel with the link, not with the payer. Mercado Pago ships the same primitive without code: "Online sales without a website — Generate a payment link in the Mercado Pago app or website and share it anywhere" (https://www.mercadopago.com.br/developers/en).

**The link carries context that removes typing.** Stripe links accept `prefilled_email`, `prefilled_promo_code` and `locale` as URL parameters, and `client_reference_id` to reconcile the session with your own systems (https://docs.stripe.com/payment-links/customize, https://docs.stripe.com/payment-links/url-parameters). Invalid parameter values are *silently dropped* so "your payment page continues to work as expected" (same URL). UTM parameters ride along and are echoed onto the post-payment redirect, so you learn which channel produced the payment without a tracking SDK.

**QR is a link with a camera.** Mercado Pago: "When scanning the code, the amount to pay appears automatically on the customer's device, streamlining the process" (https://www.mercadopago.com.br/developers/en/docs/qr-code/overview). Three models — static (fixed POS), dynamic (unique per transaction), hybrid — exist so the *amount* can be prefilled while the *code* stays reusable. The same content is available as a deep link; a QR is just the camera's way of opening it.

**The pay screen shows only what this payer can actually use.** Stripe orders payment methods dynamically "to display the most relevant eligible payment methods to each customer to maximize conversion", and the set depends on the customer's country (BLIK is shown only to Polish customers), currency, and amount (https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods). Apple Pay and Google Pay appear when the device has them enabled (https://docs.stripe.com/payment-links/create). Mercado Pago's hosted Checkout Pro offers "Quick payment with the payment methods saved in Mercado Pago", "Option to pay without a Mercado Pago account, as a guest user", and "Recovery of rejected payments" (https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/overview).

**Session handoff is a short-lived token, not a login.** Coinbase Onramp: your backend mints a session token and redirects the user; "Session tokens are single-use and expire after 5 minutes. You must create a new token for each user session" (https://docs.cdp.coinbase.com/onramp/onramp-overview). Guest checkout works with "a debit card, Apple Pay, or Google Pay (no Coinbase account required)" (same page). Note the asymmetry the same docs state: cashing *out* requires a Coinbase account with linked bank details, "Guest checkout is NOT supported for fiat withdrawals" (https://github.com/coinbase/onramp-demo-application) — guests are welcome in, never on the way out.

### What we borrow

1. **One URL, whole invoice.** `/p/{nonce}` where `nonce` resolves to the signed `{to, amount, expiry}` (CONTEXT.md glossary). Server returns the display name, avatar/initials, purpose line, amount in dollars, and expiry. No query-string amount — the amount is inside the signed struct (AGENTS.md rule).
2. **Payer sees the pay screen without a wallet.** "Pay $12.00 to Maya" renders from the link alone. The wallet prompt is the *second* step, only after a tap on Pay. Nothing asks for signup, email, or an account.
3. **One primary button.** If the browser has a passkey-capable authenticator (Mera requires HTTPS/localhost and a PRF authenticator — https://mera.category.xyz/getting-started/), the button reads **"Pay $12.00"** and both creates the payer's wallet and pays in one Face ID / Touch ID prompt. Otherwise it reads "Create wallet to pay" and the same tap does both, in that order.
4. **Show one funding path, not a wallet list.** If the payer's balance is short, offer a single inline "Add $12.00" that opens a top-up, then auto-resumes the pending payment — never a menu of chains, bridges or networks.
5. **Expire short, and say so.** Invoices carry `expiry` (5 minutes is our analogue of the Onramp session token, https://docs.cdp.coinbase.com/onramp/onramp-overview; BLIK's code is valid 2 minutes — https://www.blik.com/en/first-steps-with-blik). Expired links open to "This request has expired — ask for a new link", not an error page.
6. **Bust a link after it's paid.** Stripe lets you cap a link at N completed sessions; at the limit "it automatically deactivates" and shows a message you can write yourself (https://docs.stripe.com/payment-links/customize). Ours: a consumed nonce re-opens to the receipt, not a second payment.
7. **Measure the funnel with what the link already carries.** `client_reference_id` on the link, UTMs preserved through the redirect (https://docs.stripe.com/payment-links/url-parameters). Log opens, pay-starts, and completions per link so the demo can say "3 of 5 opened links paid".

### Why

Judges spend minutes, and the first minute is spent deciding whether this is safe (see §4). Every step above that is *not* "decide → pay" is a leak. The wallet is the substitution for card details, not a step the payer has to understand; and a link that renders as a product page is legible to a stranger in a way a signed struct is not.

---

## 2. Confirmation, status states, and receipts

### What the apps do

**There is a named state machine, and it is small.** Stripe's PaymentIntent moves `requires_payment_method` → `requires_confirmation` → `requires_action` → `processing` → `succeeded` / `canceled`. Semantics we can copy verbatim: `succeeded` means "the corresponding payment flow is complete… you can confidently fulfill"; on failure "the PaymentIntent's status returns to `requires_payment_method` so that the payment can be retried" (https://docs.stripe.com/payments/paymentintents/lifecycle).

**"Processing" is a real, explained state.** Stripe reserves `processing` for asynchronous payment methods where the payment "can't be guaranteed" — bank debits, vouchers — that "might take between 2 and 14 days to confirm" (https://docs.stripe.com/payment-links/create). Consumer apps use the same word for the same job: Zelle's safety material tells users that sending is "a fast way to send money" and to expect availability "within minutes" (https://www.zelle.com/digital-payment-education), while bank-app confirmation flows surface an approve-or-hold step rather than a silent wait (BLIK: "every transaction must be confirmed in the banking app" — https://www.blik.com/en/first-steps-with-blik).

**Success is a short confirmation page you can replace.** Stripe: "After a successful payment, your customer sees a localized confirmation message thanking them for their purchase. You can customize the confirmation message or redirect to a URL of your choice", and `{CHECKOUT_SESSION_ID}` can be injected into your redirect so your own page tailors the message (https://docs.stripe.com/payment-links/post-payment). Stripe also reports link-level **Views / Sales / Revenue** — open rate is a first-class product metric (same page).

**Receipts are artifacts, and they only exist for money that moved.** "Stripe creates receipts for all successful payments and refunds… For payments, receipts are only sent if the payment succeeds. Nothing is sent if a payment fails or gets declined" (https://docs.stripe.com/receipts). Each receipt has a viewable URL; "links to receipts expire after 30 days" and an expired link asks the customer for the email on the original transaction before regenerating (same page). Receipts must carry support contact details (legal name, support address, support email, privacy policy URL — same page), and refunds say when money lands: "5-10 business days" (https://docs.stripe.com/payment-links/post-payment).

**Onchain, the "confirmed" signal is an event, not a balance change.** Base's payments docs: "Protocol events identify the lifecycle operation; raw token transfers do not" and "A successful `PaymentCharged` event is the settlement signal", with the caution "Never trust the browser — confirm … server-side" (https://docs.base.org/build-on-base/accept-payments/request-a-payment, https://docs.base.org/build-on-base/accept-payments/verify-a-payment). Replay is handled by a uniqueness constraint on `chain + tx + logIndex`, which rejects a re-delivered event with "event already processed" and refuses fulfillment (same pages). For a plain AUSD transfer, the same discipline applies: don't infer settlement from a balance read.

### What we borrow

**Five states, four screens.** Model the payment as `draft → confirming → submitted → confirmed | failed | expired`, mirroring Stripe's names without its words:

| State | Payer sees | Trigger |
|---|---|---|
| `draft` | Pay screen: "Maya · Pizza Friday · Pay $12.00" | link opened, signature verified |
| `confirming` | Tap disabled, button reads "Waiting for your approval…" | passkey / wallet prompt open |
| `submitted` | Spinner + **"Finishing your payment…"** | tx submitted, not yet mined |
| `confirmed` | Success screen + receipt | receipt has the `Transfer` event / tx mined |
| `failed` | One line, one action | error, see §5 |
| `expired` | "This request expired. Ask for a new link." | `now > expiry` |

**Never show "pending" without saying what it means.** Zelle sets the expectation in one clause — money moves "within minutes" (https://www.zelle.com/digital-payment-education) — so ours reads: "Payments usually land right away — this one is still confirming. Don't pay twice; we'll update this page." If you ever add a slow path (a hosted onramp), reuse Stripe's own wording: some methods "might take between 2 and 14 days to confirm" (https://docs.stripe.com/payment-links/create).

**The receipt is the success screen.** One page: amount in dollars, who was paid (name + a short address as proof, e.g. `0x9f3a…c2`), a `View on MonadScan` link, a timestamp, and a "Copy receipt" button — Stripe's receipt URL model (https://docs.stripe.com/receipts), stored server-side at confirmation. Offer it to *both* sides: the payer's phone gets a copy, the requester's activity list gets a row that opens the same receipt. Re-opening a paid link lands on that receipt — that's the link-cap pattern from §1, and it also prevents the "did it go through? pay again" panic that pending states breed.

**Trust the event, not the UI.** `confirmed` requires a mined receipt whose `Transfer` log matches the invoice's `to`/`amount` (https://docs.base.org/build-on-base/accept-payments/verify-a-payment). Consume it once, keyed like Base's `chain + tx + logIndex`, so a double-fetched receipt cannot double-mark the request paid.

### Why

Judges will ask "how do you know it actually paid?" and "what if I pay twice?". A named state machine answers both, and a receipt screen is the artifact they'll screenshot. Re-using Stripe's semantics (`succeeded` = fulfill, failure = retryable) means the logic is battle-tested vocabulary we can explain in one sentence.

---

## 3. Amount entry and validation

### What the apps do

**Two modes, chosen by who knows the price.** Stripe Payment Links supports "Products or subscriptions — Best for e-commerce or SaaS where you're selling a product for a fixed price" and "Customers choose what to pay — Best for donations, tipping, or pay-what-you-want", where you may "Set a suggested preset amount" and "minimum and maximum payment amounts. By default, the maximum payment amount is 10,000.00 USD" (https://docs.stripe.com/payment-links/create). A preset is a *default*, not a lock — that's the whole trick for a shared tab.

**Bounds are enforced by the issuer, not only the app.** Stripe applies its own minimum/maximum, then per-method minimums and maximums on top (SEPA is unavailable above 10,000 EUR), and "The final amount, including tax and discounts, is the amount used to determine available payment methods" (https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods). The amount shown is the amount charged.

**The QR/link precedent: don't ask the payer to type the amount at all.** "When scanning the code, the amount to pay appears automatically on the customer's device" (https://www.mercadopago.com.br/developers/en/docs/qr-code/overview). BLIK removes the card and the banking login entirely: all you need is "a phone with Internet access and your bank's app", and you "do not have to log in to online banking, enter SMS passwords or provide your payment card details" (https://www.blik.com/en/first-steps-with-blik).

**Input length is pre-validated, error at the field.** Stripe's card fields validate the number/CVC/expiry at entry so a decline from "incorrect card data" is rare; when it happens, "ask your customer to re-enter their card information" (https://docs.stripe.com/declines/card).

### What we borrow

**Default-to-fixed, allow-tip, never re-key the amount.** The requester picks a mode when creating the request: *Charge exactly* (pays the signed amount) or *Any amount up to* (payer may reduce, with a suggested preset and a floor). Both are Stripe's two modes, and both are within our struct: variable mode simply signs `{amount: max, allowPartial: true}` and the app pays `min(entered, max)` — with the chosen amount echoed in the confirmation so the requester sees what arrived.

**Free field only when the amount is unknown, and only on the payer's phone.** A numeric keypad field, currency prefix `$`, no decimal spinner: parse as cents. Presets render as chips ($5 / $10 / $20) with the requester's suggestion preselected.

**Validate before the wallet prompt, and say what to do.** Rules, each with a one-line fix: empty → "Enter an amount"; below minimum → "Minimum is $1.00"; above cap → "Maximum is $500.00"; non-numeric → "Use numbers only". Mirrors Stripe's advice codes: `confirm_card_data` → "The details don't match. Check the amount and try again" (https://docs.stripe.com/declines/card). Never let an invalid amount reach the signing prompt — an `expiresAt`/bounds check before the passkey prompt is the cheapest fraud guard we have (https://docs.stripe.com/payment-links/create shows bounds live in the product, not in the post-hoc error).

**Balance is a soft block, not a dead end.** If balance < amount, disable Pay and show "You'll need $12.00 — you have $4.00" with a single "Add money" button (BLIK's framing: the only prerequisites are a phone and the bank app, https://www.blik.com/en/first-steps-with-blik). Amounts display as dollars everywhere, per AGENTS.md.

### Why

The payer's only real decisions are *how much* and *is this the right person*. Everything numeric should be prefilled, bounded, and editable in one tap. Getting validation before the biometric prompt is what makes the passkey flow feel like a Face ID tap instead of a form.

---

## 4. Trust and anti-scam signals

### What the apps do

**The dominant pattern is a paid-safety warning at the moment of payment, not buried in terms.** Zelle's P2P Safety 101 is three lines on the send screen: "Only Send Money to Those You Trust"; "Treat Zelle Like Cash — money goes directly into the enrolled recipient's bank account. Always double check you have the recipient's correct U.S. mobile number, email address, or Zelle Tag so the money goes to the right person"; "Beware of Payment Scams… it's important to slow down and keep an eye out for signs of a scam" (https://www.zelle.com/digital-payment-education). Zelle also separates **fraud** (someone takes your credentials) from **scams** (you are tricked into sending), "because there may be differences in the protections available to you" (same page).

**The guidance is scenario-shaped, because scams are scenario-shaped.** Zelle ships dedicated explainers for ticket, job, marketplace, romance and social-engineering scams (https://www.zelle.com/digital-payment-education) and a general tips page: enable MFA, turn on bank alerts, "Steer clear of phishing calls and emails", and never give details to an inbound caller — "Hang up and call your bank at the phone number listed on the back of your bank-issued debit card" (https://www.zelle.com/tips-safe-payments).

**The card networks do the same in-product.** Stripe lists 3DS 2.0 authentication, fraud-prevention tooling and "Buyer identity verification" as checkout features, with "Facial recognition with FaceAuth to access the Mercado Pago account" in Mercado Pago's hosted checkout (https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/overview). BLIK's model is the strongest version of the idea: "every transaction must be confirmed in the banking app" (https://www.blik.com/en/first-steps-with-blik) — the credential the user already trusts gates the money.

**Trust also comes from the page's own substance.** Stripe recommends displaying return, refund and legal policies plus support contact on the payment page, because "Presenting this information can increase customer confidence and minimize cart abandonment" (https://docs.stripe.com/payment-links/customize). Stripe also puts payment links on your own domain (`pay.example.com`) instead of `buy.stripe.com` (same page) — a recognizable host is itself a signal.

### What we borrow

**Show a named person, not an address.** "Maya" + avatar, with the destination address available behind a tap ("Show the address"). Zelle's rule is that the recipient identity is the thing people get wrong, so identity must be a first-class visual element, not a truncated `0x…` (https://www.zelle.com/digital-payment-education).

**One-line cash-equivalent warning above the Pay button.** Our Zelle line: *"Payments are instant and can't be reversed — like handing over cash. Only pay people you know."* Say the irreversibility *once*, in plain words, at the point of payment. This is also the honest framing for a direct AUSD transfer with no dispute window.

**Bind the link to the requester, and make the UI show that binding.** The signed `{to, …}` is verified on open (AGENTS.md rule), and the pay screen names the verified requester. A tampered amount or recipient fails verification *before* any wallet prompt — which we can state on the page: "This link was signed by Maya and can't be altered." Crypto's worst scam pattern is a swapped destination; the signature check is the whole defense, so make it visible.

**A scam checklist, on the page, three bullets.** Reuse Zelle's structure at our scale: (1) Does the name match the person messaging you? (2) Is the amount what you agreed to? (3) Was the link sent to you directly, not forwarded? Plus a "Report this link" action that flags the nonce (Zelle's advice: if something looks off, contact your financial institution — https://www.zelle.com/digital-payment-education).

**Reversibility is a support path, not a feature.** Zelle doesn't fake reversals either; it teaches you who to call — "If you detect suspicious activity, contact your financial institution directly" (https://www.zelle.com/digital-payment-education). Ours: the receipt page carries support contact, matching Stripe's receipt requirements (https://docs.stripe.com/receipts), and a documented dispute path in the hackathon README.

**On your own domain.** Serve pay links from the app's domain, never a bare `buy.stripe.com`-style vanity host you don't control (https://docs.stripe.com/payment-links/customize).

### Why

Guest P2P crypto is Zelle's exact risk profile: instant, irreversible, wrong-recipient-prone, and the payer has no account to fall back on. Zelle's answer — show the person, warn once, point at a human — transfers directly. The signature verification is our version of 3DS, and the demo should make it visible rather than invisible.

---

## 5. Jargon-free copy, errors, and retry

### What the apps do

**BLIK is the benchmark for jargon-free and for prerequisite framing.** The whole method is described as: "BLIK is a payment method which enables you to pay easily and quickly… You don't need a payment card or wallet to pay with BLIK. All you need is a phone with Internet access and your bank's app" (https://www.blik.com/en/first-steps-with-blik). The credential is described by shape and lifetime, not protocol: "a one-off, 6-digit code, which you will find in your bank's app. It is valid for 2 minutes. After that time, you can generate a new one" (same page). No word about tokens or sessions. Same page lists three prerequisites as numbered icons: banking app (19 banks), a phone, internet.

**Failures are classified into three actions, not three errors.** Stripe's advice codes map failure to a next step: `do_not_try_again` → don't reuse that method, the customer may need to contact their issuer; `try_again_later` → "Ask the customer to attempt the payment again"; `confirm_card_data` → "The customer needs to validate the information on their card" (https://docs.stripe.com/declines/card). On-session failures are handled by "prompt them to try their payment method again or ask for a new payment method" (same page). So: *retry / fix your input / go elsewhere* — never a raw reason string.

**Deactivated links get authored copy, not an error page.** Stripe's `inactive_message` example is literally "Sorry, we're out of stock for now!" (https://docs.stripe.com/payment-links/customize).

**Receipts and confirmations are localized and branded**, not templated English (https://docs.stripe.com/payment-links/post-payment, https://docs.stripe.com/receipts).

### What we borrow — the copy deck

States, in the user's words, with the jargon in parentheses only for us:

| Situation | Say this | Never say |
|---|---|---|
| Link open | **"Maya is asking for $12.00"** + "Pizza Friday" + "Pay $12.00" | "invoice", "invoice nonce", "EIP-712" |
| No wallet yet | **"Create your wallet to pay"** + "One tap with Face ID. No seed phrase, no app install." | "EOA", "key derivation", "secp256k1" |
| Signing | **"Waiting for your approval…"** | "sign typed data", "personal_sign", "0x…" |
| Submitted | **"Finishing your payment…"** + "This takes a second." | "broadcasting", "waiting for inclusion", "pending nonce" |
| Done | **"Paid. $12.00 sent to Maya."** + "Done" + receipt + "View on MonadScan" | "tx confirmed", "finalized", "0 conf" |
| Not enough funds | **"You'll need $12.00. You have $4.00."** + [Add money] | "insufficient balance for transfer" |
| Wrong network ever | **"This wallet is on a different network."** + [Switch] | "chainId mismatch: expected 143" |
| Link expired | **"This request expired. Ask Maya for a new link."** | "expiry timestamp elapsed" |
| Already paid | **"You already paid this. Here's your receipt."** | "nonce already used" (that string exists in our logs, not the UI) |
| Link altered | **"This link doesn't match what Maya signed. Don't pay it — ask for a new one."** | "signature verification failed" |
| Slow/rate-limited | **"Payments are usually instant — this one is still confirming. Don't pay twice."** | "rejected: replacement fee too low" |
| Rejected (retryable) | **"That didn't go through. Try again."** + [Try again] | "user rejected the request" |
| Rejected (needs fix) | **"Check the amount and try again."** + focus the amount field | "invalid input" |

Rules of thumb, from the sources above: three classes of failure → three different buttons (`do_not_try_again` / `try_again_later` / `confirm_card_data`, https://docs.stripe.com/declines/card); no state without an action; state what happens next and how long (BLIK: "valid for 2 minutes", https://www.blik.com/en/first-steps-with-blik); name the prerequisite positively (BLIK's "all you need is a phone with Internet access and your bank's app", https://www.blik.com/en/first-steps-with-blik); never show `0x…` where a name fits, and never show a wallet error code to a payer.

### Why

Jargon is where crypto payment products lose their first-time users, and this audience is explicitly non-crypto (CONTEXT.md: "Has no crypto knowledge assumed"). Every table cell above is a decision we don't have to re-litigate at build time, and each one is traceable to something a billion-user product actually says.

---

## The 5 highest-leverage patterns for the demo

Ranked by minutes-saved-per-implementation-hour in the first five minutes of a judge's session.

1. **Link renders a named-person pay screen, no signup, no wallet yet.** `Maya · Pizza Friday · Pay $12.00`, one button, identity from the signed invoice (Stripe hosted link + Mercado Pago payment link, https://docs.stripe.com/payment-links/create, https://www.mercadopago.com.br/developers/en). This is the whole first impression; everything else is refinement.
2. **One tap = wallet + payment.** If the payer has no wallet, the same Face ID prompt creates it and pays. "No seed phrase, no app install" (BLIK's "all you need is a phone with Internet access and your bank's app", https://www.blik.com/en/first-steps-with-blik). Collapsing two flows into one prompt is the single biggest perceived-speed win.
3. **Honest, explained states ending in a receipt.** `submitted → confirmed`, with "Finishing your payment…" while it lands, then a receipt with amount, recipient, timestamp and a MonadScan link — and re-opening a paid link shows that receipt, never a second charge (Stripe receipts, https://docs.stripe.com/receipts; link caps, https://docs.stripe.com/payment-links/customize; Base event-based settlement, https://docs.base.org/build-on-base/accept-payments/verify-a-payment).
4. **Scam-safety in the flow, not the docs.** Named recipient, one cash-equivalent warning above the button, and a visible "signed by Maya, can't be altered" claim backed by real EIP-712 verification that rejects a tampered link *before* the signing prompt (Zelle's three safety pillars, https://www.zelle.com/digital-payment-education). Judges will tamper with a link on purpose; failing loudly and safely is the demo.
5. **Zero-jargon copy with one action per failure.** The table in §5, applied verbatim, including short expiries (5 minutes, per the single-use Onramp session token at https://docs.cdp.coinbase.com/onramp/onramp-overview) and single-reuse links. "Paid. $12.00 sent to Maya." is the sentence the demo is remembered by.
