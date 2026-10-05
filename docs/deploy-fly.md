# Deploying to Fly.io

One machine runs both processes: the app on `:3101` and the top-up relayer on `:8791`,
reached as a split origin — the same arrangement as `localhost:3101` → `localhost:8791`
locally.

## What you need first

- A Fly account and the `fly` CLI (`brew install flyctl`, then `fly auth login`).
- Your Privy app id from <https://dashboard.privy.io>.
- **The deployed origin added to Privy.** This is the step that breaks sign-in and it is
  invisible until you test it: dashboard → your app → **Allowed Origins** → add
  `https://ping-pong-pay.fly.dev`. Without it Privy refuses to load and the app renders a
  permanent "Loading…".
- The relayer wallet funded with testnet MON (gas) and testnet USDC (inventory).

## Deploy


## If the container build fails with ERR_PNPM_IGNORED_BUILDS

pnpm 10 reads build-script approvals from **`app/pnpm-workspace.yaml`**, not from
`package.json` — an approval added to `package.json` is silently ignored and the build
fails on the same package. The allowed list is already committed:

- `esbuild`, `lightningcss` — required to compile.
- `@reown/appkit` — a transitive dependency we do not import, listed explicitly because
  pnpm treats an unlisted build script as a hard error.
- `bufferutil`, `keccak`, `utf-8-validate` — set to `false` on purpose. They are optional
  native accelerators for viem with pure-JS fallbacks, and building them needs
  `python3`, `make` and `g++` in the image just to compile a speed-up a public demo does
  not need.

## Running the container locally

The image is verified to build and boot, so you can rehearse the deploy before paying for
one:

```bash
docker build -t ppp --build-arg VITE_PRIVY_APP_ID=<id> .
docker run --rm -p 3101:3101 -p 8791:8791 \
  -e RELAYER_PRIVATE_KEY=0x... \
  -e ALLOWED_ORIGIN=http://localhost:3101 \
  ppp
```

Then open <http://localhost:3101>. Identical to `pnpm dev` + `pnpm relayer`, which is the
point: what you rehearse locally is what runs in production.
```bash
cd app

# First run only: creates the app, does not deploy.
fly launch --no-deploy --copy-config

# Build args, because Vite inlines VITE_* at build time. Setting these as Fly
# env vars instead does nothing to the client bundle — a quiet, common mistake.
fly deploy \
  --build-arg VITE_PRIVY_APP_ID=<your_app_id> \
  --build-arg VITE_RELAYER_URL=https://ping-pong-pay.fly.dev:8791

# Secrets. Never as build args, never with a VITE_ prefix.
fly secrets set RELAYER_PRIVATE_KEY=0x... ALLOWED_ORIGIN=https://ping-pong-pay.fly.dev
```

`ALLOWED_ORIGIN` pins the relayer's CORS to the app's origin. Without it the relayer
falls back to `*`, which on a public host means any website could spend the wallet's
USDC. That is an open faucet, not a demo.

## Verify before you record anything

```bash
curl -s -o /dev/null -w "app %{http_code}\n" https://ping-pong-pay.fly.dev/
curl -s -o /dev/null -w "relayer %{http_code}\n" -X OPTIONS https://ping-pong-pay.fly.dev:8791/topup
fly logs
```

Then, in a **logged-out or private browser**:

1. The home page renders — not "Loading…" forever. That means Privy accepted the origin.
2. Sign in with email. A wallet is created.
3. **Add money** → balance goes up by $2. This proves the relayer works end to end in
   production, including CORS.
4. Create a link, open it in a private window, pay it. Watch the freelancer's balance move.

## Before recording the demo

Set `min_machines_running = 1` in `fly.toml` and redeploy. With `0`, the machine stops
when idle and the first tap after a pause waits on a cold start — the worst possible
moment for it to happen on camera. Turn it back to `0` afterwards to stop paying for an
idle machine.

Relayer inventory is finite: $2 per top-up, $6 per address. Check the balance before you
record, or you will be re-filming a 503.

## Rolling back

```bash
fly releases          # pick a release
fly deploy --image <registry-image-of-the-previous-release>
```

## Cost

One 512MB shared-cpu VM. Free allowance covers this if it is not always on; an always-on
machine for the demo period is a few dollars a month. Set `min_machines_running = 0` and
`auto_stop_machines = "stop"` when you are done recording.

## Local equivalent

The container runs the same two commands you already use:

```bash
pnpm dev      # app on :3101
pnpm relayer  # relayer on :8791
```

`./start.sh` runs both, which is what the container's `CMD` invokes. To test that script
locally without Docker: `./start.sh` then check `curl localhost:3101`.