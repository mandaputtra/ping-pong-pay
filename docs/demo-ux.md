# Demo UX: motion, passkeys, accessibility

Scope: the guest pays a payment link with no signup. The judge gives a first five minutes.
Every rule below is either a direct quote from a primary source or an implementation
decision that follows from one. Sources are inline.

Stack note (`app/package.json`): vanilla TypeScript + Vite, `viem` only — no React,
no animation library, no CSS framework. Section 6 says which of this needs what.

---

## 1. Motion that signals success

**The governing rule is restraint, not delight.** Apple: "Add motion purposefully,
supporting the experience without overshadowing it. Don't add motion for the sake of
adding motion. Gratuitous or excessive animation can distract people and may make them
feel disconnected or physically uncomfortable."
([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion))

**Feedback animation should be brief and precise.** Apple: "When animated feedback is
brief and precise, it tends to feel lightweight and unobtrusive, and it can often convey
information more effectively than prominent animation."
([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion))

**Don't animate frequent interactions.** Apple: "In apps, generally avoid adding motion
to UI interactions that occur frequently. … For a custom element, you generally want to
avoid making people spend extra time paying attention to unnecessary motion every time
they interact with it."
([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion))
The Pay button is the most frequent control in the product. It gets a `:active` state
instantly, not an animation.

**Confirmation is warranted for a payment — and must not block.** Apple singles out
payments as the case where people *want* confirmation: "people appreciate getting
feedback that confirms a successful Apple Pay transaction."
([HIG Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback))

### Durations and easing

Material Design 3 publishes a stepped duration scale
(`md.sys.motion.duration.*`: 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
700, 800, 900, 1000 ms) and a four-curve easing set
(`standard`, `standard-decelerate` `cubic-bezier(0,0,0,1)`, `standard-accelerate`
`cubic-bezier(0.3,0,1,1)`, `emphasized` `cubic-bezier(0.2,0,0,1)`, plus the
`emphasized-decelerate` / `emphasized-accelerate` pair)
— ([M3 easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs),
values in [material-tokens `css/motion.css`](https://github.com/material-foundation/material-tokens/blob/main/css/motion.css)).

Chosen for this product:

| Element | Duration | Easing | Why |
|---|---|---|---|
| Button press feedback | 100 ms | `ease-out` | one step below M3's shortest named scale; must feel mechanical |
| Amount row → status swap (paid / failed) | 200 ms | `cubic-bezier(0, 0, 0, 1)` (standard-decelerate) | M3 short step, decelerate curve — content arrives and settles |
| Checkmark draw | 200 ms | `linear` | a stroke-dash reveal is a geometric change, not a physical one |
| Progress indicator (tx pending) | 1000 ms loop | `linear` | M3's longest token; slow enough not to read as a stall |

Only `transform` and `opacity` are animated. web.dev: "To improve the performance of your
CSS animations, use the `transform` and `opacity` CSS properties as much as possible, and
avoid anything that triggers layout or painting."
([web.dev, high-performance CSS animations](https://web.dev/articles/animations-guide))
`will-change` is not set at all — it is for elements "that are always about to change,"
and these are not
([web.dev](https://web.dev/articles/animations-guide)). The status block replaces the
amount block in place; only opacity and the checkmark's stroke change. Nothing reflows
mid-payment, so no layout-animating property is ever touched.

### What to animate on success

1. The amount line crossfades to a confirmed state (opacity, 200 ms).
2. A checkmark draws once (stroke-dashoffset, 200 ms, linear), then stops.
3. The transaction hash link fades in.
4. Nothing else moves. No confetti, no count-up of the amount, no card flip.

The transaction hash is the real "receipt" and it appears within the same 200 ms as the
check, so the confirmation is complete in a single beat.

### What motion is doing while the chain confirms

A transaction submission has real latency (block inclusion on Monad), and the user will
be staring at the screen. The rule from Apple: "As much as possible, don't make people wait
for an animation to complete before they can do anything, especially if they have to
experience the animation more than once."
([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion))

So the pending state is a progress indicator plus the text "Waiting for confirmation…",
and the page stays fully usable — the hash link, the "view on explorer" link, and a
retry affordance are all live. Apple's definition of a progress indicator is exactly this
job: "let people know that your app isn't stalled while it loads content or performs
lengthy operations"
([HIG Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)).

---

## 2. Reduced-motion fallback

**Respect the OS setting.** `prefers-reduced-motion` "is used to detect if the user has set
an operating system preference to minimize the amount of animation or motion it uses," and
its `reduce` value means interfaces "should minimize movement or animation, preferably to
the point where all non-essential movement is removed."
([web.dev, prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion))

The pattern web.dev gives is to opt *in*:

```css
@media (prefers-reduced-motion: no-preference) {
  .paid { animation: draw-check 200ms linear both; }
  .status { transition: opacity 200ms cubic-bezier(0, 0, 0, 1); }
}
```

Only animation that has no effect outside the media query exists, so there's nothing to
undo when the preference flips mid-session. The `matchMedia` change listener that
web.dev shows is for JS-driven animations; this app has none
([web.dev](https://web.dev/articles/prefers-reduced-motion)).

**Reduced-motion fallback here = opacity only, never zero.** The checkmark swaps from
stroke-dashoffset animation to appearing fully drawn; the amount crossfade stays (opacity
is not vestibular motion); the progress indicator becomes a static "…" text plus the same
sentence. Nothing about the payment's *state* depends on motion, so the reduced variant
loses no information. Apple: "it's essential to avoid using it as the only way to
communicate important information"
([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).

**Motion that is too much is a health issue, not a preference.** Apple on fast-moving and
blinking effects: "it can be distracting, cause dizziness, and in some cases even result in
epileptic episodes. … ensure your app or game responds by reducing automatic and repetitive
animations, including zooming, scaling, and peripheral motion," and lists "avoiding
animating depth changes in z-axis layers" as a reduced-motion best practice
([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).

The WCAG bar is AAA (SC 2.3.3, motion animation triggered by interaction must be
disablable unless essential), satisfied by the `prefers-reduced-motion` query — techniques
C39 (CSS) and SCR40 (JavaScript)
([Understanding 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)).
`prefers-reduced-motion` is not inherited or overridden by the page; it is the OS-level
macOS "Reduce motion" / Android "Remove animations" setting
([web.dev](https://web.dev/articles/prefers-reduced-motion)).

---

## 3. Passkey prompt copy and prompt avoidance

A guest paying a link has never heard of us. The passkey prompt is the single most
frightening moment in a five-minute demo, so it gets the most explicit guidance.

### Never fire a modal the guest didn't ask for

**Use conditional UI so the OS dialog appears inside the native autofill affordance, not as
a surprise.** "A conditional request to WebAuthn's `navigator.credentials.get()` API does
not show UI immediately. Instead, it waits in a pending state until the user interacts with
the username field's autofill prompt."
([web.dev, sign in with a passkey through form autofill](https://web.dev/articles/passkey-form-autofill))

The trigger is a real `<input autocomplete="username webauthn" autofocus>` — focusing a
field the user was going to focus anyway
([web.dev](https://web.dev/articles/passkey-form-autofill)).

**Feature-detect before rendering any passkey UI.** Show the "Create a passkey" button only
if `PublicKeyCredential.getClientCapabilities()` reports `conditionalGet` and
`passkeyPlatformAuthenticator`
([web.dev, create a passkey](https://web.dev/articles/passkey-registration)). A dead
passkey button in a demo costs more than no passkey button.

**Don't add a second factor.** "Passkeys offer robust, built-in protection against common
threats like phishing. Therefore, a second authentication factor does not add significant
security value. Instead, it creates an unnecessary step for users during sign-in."
([web.dev](https://web.dev/articles/passkey-form-autofill))

### The copy

Google's content guidance, in order of usefulness for this flow
([Google, Communicating passkeys to users](https://developers.google.com/identity/passkeys/ux/communicating-passkeys)):

- **Say the word "passkey" in the UI** — "we recommend that you use the term passkeys
  explicitly in your UI because it's a step towards educating users and making passkeys a
  common term."
- **Anchor to the familiar.** "Associate them with familiar concepts, visuals, and
  experiences, such as biometrics or passwords … associating them with biometrics makes
  them more familiar and can boost user perception of security benefits."
- **Say what will happen before the OS dialog appears, and confirm after.** "For any
  passkeys related actions, show users clear messages in your app UI before triggering the
  operating system (OS) dialogs. After the passkeys OS dialogs are completed or dismissed,
  show the resulting status of the task."
- **Keep the explanation visible** rather than behind a link: "Make helpful information
  about passkeys visible in the user interface by default, rather than hiding it behind
  clicks."
- **Lead with the benefit for this audience.** "if your platform is an e-commerce service,
  the convenience and speed might be the most attractive features."

Resulting strings (one line each, all above the button):

| Moment | Copy |
|---|---|
| Page body | "Pay 12.00 USDC to Alex. No account needed." |
| Wallet prompt heading | "Sign in to pay" + "Use your fingerprint, face, or screen lock. This is a passkey — it replaces a password." |
| After OS dialog | "Passkey created" / "Signed in" |
| On cancel | "Canceled. Pay another way." (see error handling below) |

**The privacy reassurance line is the one thing worth pre-writing.** Google: "Several
concerns that end users may raise appear below; to reassure your users, developers should
add a reassuring message to the UI (e.g. 'With passkeys, the user's biometric information
is never revealed to the website or the app. Biometric material never leaves the user's
personal device') and create a FAQ or support article explaining more."
([Google, Passkeys](https://developers.google.com/identity/passkeys))

### When it fails

**A cancel is not an error.** `NotAllowedError` means "The user canceled the operation, or
no passkey was selected"
([web.dev](https://web.dev/articles/passkey-form-autofill)). Render a neutral line and
leave the manual wallet path visible. Never a red error banner, never a retry loop.

**Self-heal stale credentials.** If the backend 404s on a presented credential ID, call
`PublicKeyCredential.signalUnknownCredential()` so the provider prunes the orphaned
passkey; "this mismatch can lead to a confusing user experience if the passkey provider
continues to suggest a passkey that no longer works with your site"
([web.dev](https://web.dev/articles/passkey-form-autofill)).

**Don't nag about passkey creation.** "Encourage users to create a passkey. … However,
avoid excessive prompts, which can be intrusive to the user experience."
([web.dev](https://web.dev/articles/passkey-form-autofill)). One prompt after a completed
payment, never on payment-page load.

**Passkeys coexist, they don't replace the page.** Apple: "This lets people use passkeys
alongside passwords, so you don't need to adjust your sign-in page based on credential
type"
([Apple, Passkeys](https://developer.apple.com/passkeys/)).

---

## 4. Accessibility essentials for a money UI

**Amount formatting is not a string concat.** `Intl.NumberFormat` with
`{ style: "currency", currency: "USDC" }` (or the token's display currency) handles
grouping, symbol placement, and the minor-unit rule — "The Japanese yen doesn't use a minor
unit" — which is why a hardcoded `toFixed(2)` is wrong for some currencies
([MDN, `Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)).
`formatToParts()` exists if the symbol ever needs splitting
([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)).
The amount must also be real text, not an image of digits.

**Status must not be color-only.** WCAG 1.4.1 (Level A): "Color is not used as the only
visual means of conveying information, indicating an action, prompting a response, or
distinguishing a visual element," and if two colors differ only in hue, "an additional
visual
indicator will be required regardless of the contrast ratio between those colors. For
example, knowing whether an outline is green for valid or red for invalid."
([Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html))
"Paid" and "Failed" are therefore words plus an icon plus a color, never color alone
(technique G14). Apple says the same from the other side: "when you provide feedback using
color, text, sound, and haptics, people can receive it whether they silence their device,
look away from the screen, or use VoiceOver"
([HIG Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)) —
in a browser, that trio is color + text + `aria-live`.

**Announce the transition to screen readers.** The pending → paid state change happens
without a navigation, so it needs a live region (`role="status"` / `aria-live="polite"`)
carrying "Payment confirmed. 12.00 USDC sent to Alex." WCAG 3.3.8 (Accessible
Authentication, Level AA) requires at least one authentication method that does not rely
on a cognitive function test; WebAuthn satisfies it outright
([Passkey Central, Passkey Accessibility](https://www.passkeycentral.org/resources-and-tools/passkey-accessibility)).

**Focus must be visible at all times.** WCAG 2.4.7 (Level AA): "Any keyboard operable user
interface has a mode of operation where the keyboard focus indicator is visible," and "the
focus indicator must not be time limited: when the keyboard focus is shown, it must remain
visible" (technique C45, `:focus-visible`)
([Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)).
On confirmation, move focus to the success heading — but the success itself is also in a
live region, so neither mechanism depends on the other.

**The Pay button is the primary target.** WCAG 2.5.8 (Level AA) sets a floor of 24×24 CSS
pixels, and explicitly recommends the stricter 2.5.5 Target Size (Enhanced) "for important
links/controls"
([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
The Pay button is full-width, well past both.

**Text must scale.** Apple's accessibility guidance: "Ideally, give people the option to
enlarge text by at least 200 percent"
([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
Fixed-height amount containers are the usual failure — they clip at 200%.

**No time limits on the confirmation.** A payment is not a timed challenge, and FIDO
flags this: "Except in cases where the time limit is essential … relying parties might
allow users to turn off, adjust, or extend the time limit" (WCAG 2.2.1 Timing Adjustable)
([Passkey Central](https://www.passkeycentral.org/resources-and-tools/passkey-accessibility)).

**QR codes are an accessibility trap.** FIDO's audit of live passkey deployments: "QR codes
introduce barriers for individuals with mobility limitations or with vision limitations."
The cross-device QR fallback stays, but it is never the default path
([Passkey Central](https://www.passkeycentral.org/resources-and-tools/passkey-accessibility)).

---

## 5. No-go effects

Anything that adds latency, hides state, or can be misread as "the payment failed."

| No-go | Why |
|---|---|
| Full-screen interstitial before the Pay button | Adds a click and a read to the five minutes; nothing is gained — the amount and recipient are already on screen |
| Count-up animation of the amount | Slow, and a moving number is harder to verify than a static one. Apple: gratuitous animation "can distract people and may make them feel disconnected" ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)) |
| Confetti / particle burst on success | Decorative motion on a financial UI. Apple: "Don't add motion for the sake of adding motion" ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)) |
| Anything gated behind an animation finishing | "don't make people wait for an animation to complete before they can do anything" ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)) |
| Auto-dismissing the success receipt | A payment receipt must persist. Apple's alert guidance is about *critical* interruption, not celebration ([HIG Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)) |
| Skeleton screens or optimistic "Paid!" before the tx confirms | web.dev names skeleton-screen motion as a *perception hack* that makes things "feel faster" ([web.dev](https://web.dev/articles/prefers-reduced-motion)) — on a money screen it is a lie. Show the real state. |
| Infinite spinner with no elapsed time or cancel | Failure states need to be legible. Apple: "Show people when a command can't be carried out and help them understand why" ([HIG Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)) |
| Parallax, autoplaying video, 3D tilt on the pay card | Explicit vestibular triggers; motion.dev's reduced-motion guidance names parallax and autoplay as the two things to disable ([Motion for React, accessibility](https://motion.dev/docs/react-accessibility)); Apple flags peripheral motion and z-axis depth ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)) |
| Blinking or flashing status | "in some cases even result in epileptic episodes" ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)) |
| Animating `height`, `top`, `width`, `box-shadow` on the status block | Triggers layout and paint; "avoid anything that triggers layout or painting" ([web.dev](https://web.dev/articles/animations-guide)) |
| A modal that appears without user action | Breaks the conditional-UI model the whole passkey flow depends on ([web.dev](https://web.dev/articles/passkey-form-autofill)) |
| A second OTP or 2FA step after a passkey | "creates an unnecessary step for users during sign-in" ([web.dev](https://web.dev/articles/passkey-form-autofill)) |
| A passkey nag on every visit | "avoid excessive prompts, which can be intrusive" ([web.dev](https://web.dev/articles/passkey-form-autofill)) |
| A red error state for a user-initiated cancel | `NotAllowedError` is cancellation, not failure ([web.dev](https://web.dev/articles/passkey-form-autofill)) |

---

## 6. Vanilla DOM vs React / animation libraries

The app is vanilla TypeScript on Vite with `viem` (`app/package.json`). **Everything in
this document is implementable without adding React or an animation library, and nothing
here justifies adding one.**

| Item | Vanilla DOM | Notes |
|---|---|---|
| Button press feedback | ✅ CSS `:active` + 100 ms `transform`/`opacity` | |
| Amount crossfade | ✅ CSS class toggle on a `data-state` attribute | |
| Checkmark draw | ✅ CSS `@keyframes` on `stroke-dashoffset` | The one genuinely fiddly bit: 3 lines of CSS, no SVG lib |
| Progress indicator | ✅ CSS animation on a single element | |
| `prefers-reduced-motion` | ✅ CSS `@media` opt-in | No JS listener needed because no JS-driven animations exist ([web.dev](https://web.dev/articles/prefers-reduced-motion)) |
| `aria-live` status | ✅ one `role="status"` node, `textContent` swap | |
| Focus management | ✅ `.focus()` after confirmation | |
| `Intl.NumberFormat` | ✅ platform `Intl` ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)) | no polyfill, no library |
| Conditional WebAuthn | ✅ `navigator.credentials.get({ mediation: 'conditional' })` ([web.dev](https://web.dev/articles/passkey-form-autofill)) | already the stack's chosen path |

A React/motion library would only pay off if a future requirement is **layout or
gesture-driven animation** — shared-element transitions between the link page and a
receipt page, drag-to-dismiss, or spring-physics. Motion's `reducedMotion="user"` config
is genuinely good for that case: it "automatically disable[s] transform and layout
animations, while preserving the animation of other values like `opacity` and
`backgroundColor"
([Motion for React, accessibility](https://motion.dev/docs/react-accessibility)) — one
line instead of a hand-written media query per animation. That is the trigger to add it,
not the first five minutes.

**Do not add:** Framer Motion / Motion (nothing here needs JS-driven animation),
React (the page has no state tree worth one), a component library (the whole UI is one
amount, one recipient, one button), a WebGL background (decoration on a money screen).
