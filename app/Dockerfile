# syntax=docker/dockerfile:1

# Two Node processes in one container: the SSR app on :3101 and the top-up
# relayer on :8791. Fly starts both via ./start.sh. Keeping them on one host is
# what lets the browser reach the relayer without a second public hostname.

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
FROM deps AS build
COPY . .
# Both VITE_ values are public by design and read at build time by Vite. The
# relayer key is NOT needed here: it is read at runtime by the relayer process
# only.
ARG VITE_PRIVY_APP_ID
ENV VITE_PRIVY_APP_ID=$VITE_PRIVY_APP_ID
ARG VITE_RELAYER_URL
ENV VITE_RELAYER_URL=$VITE_RELAYER_URL
RUN pnpm build

# ---- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/start.sh ./start.sh
RUN chmod +x ./start.sh

COPY --from=build /app/server.mjs ./server.mjs

# Non-root: the relayer holds a hot wallet key and has no reason to be root.
RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3101 8791
CMD ["./start.sh"]