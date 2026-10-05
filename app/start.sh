#!/usr/bin/env bash
# Both processes, one container. The app must come up even if the relayer fails:
# sign-in, balance, link creation and guest pay all work without it, so a broken
# relayer should degrade the top-up button, not take the site down.
set -u

PORT="${PORT:-3101}"
RELAYER_PORT="${RELAYER_PORT:-8791}"

node --experimental-strip-types src/relayer-server.ts &
RELAYER_PID=$!

# shellcheck disable=SC2064
trap "kill $RELAYER_PID 2>/dev/null" EXIT INT TERM

echo "starting app on :$PORT (relayer on :$RELAYER_PORT)"
exec node server.mjs