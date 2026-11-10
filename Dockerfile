# Production image for Daily: one image, roles picked by docker/entrypoint.sh.
#
#   docker build -t daily --build-arg APP_VERSION=1.2.0 --build-arg GIT_SHA=$(git rev-parse HEAD) .
#   docker run --env-file daily.env daily [web|migrate]
#
# No env values are baked in: the env file is passed at run time and varlock
# validates it at boot (.env.schema uses @defaultDynamic=true).

# ---- build ------------------------------------------------------------------
# Node runs `next build` (as it does locally); Bun installs and runs scripts.
FROM node:22-slim AS build
COPY --from=oven/bun:1.3.9 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY . .
# Hoisted (classic) node_modules: Next's standalone file tracing misses
# packages in Bun's isolated store (e.g. @swc/helpers).
RUN bun install --frozen-lockfile --linker=hoisted

# The build only needs *some* valid values to load next.config; they are not
# inlined anywhere (every item is dynamic) and are not kept in the image.
RUN APP_ENV=production \
    BETTER_AUTH_URL=https://build.invalid \
    BETTER_AUTH_SECRET=build-placeholder-auth-secret-not-real \
    GITHUB_CLIENT_ID=build-placeholder-client-id \
    GITHUB_CLIENT_SECRET=build-placeholder-client-secret-not-real \
    bun run --cwd apps/web build \
 && bun run --cwd packages/db build:migrate

# ---- runtime ----------------------------------------------------------------
FROM node:22-slim AS runtime
ARG APP_VERSION=dev
ARG GIT_SHA=
LABEL org.opencontainers.image.source="https://github.com/CodeVachon/daily" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"

ENV NODE_ENV=production \
    APP_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    APP_VERSION=${APP_VERSION} \
    APP_COMMIT=${GIT_SHA}

# varlock resolves and validates the env when each role boots.
RUN npm install --global --no-fund --no-audit varlock@1.24.0 \
 && npm cache clean --force

WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/packages/db/dist/migrate.mjs ./migrate.mjs
COPY --from=build --chown=node:node /app/packages/db/drizzle ./migrations
COPY --from=build --chown=node:node /app/.env.schema ./.env.schema
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/daily

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

ENTRYPOINT ["daily"]
CMD ["web"]
