---
id: 51
title: Production Docker image (web + worker), health checks
state: Done
parent: 49
assignee: Christopher Vachon
labels: [infra]
blockedBy: [50]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T03:25:53Z
---

## Description

One Docker image of the application, pulled by the Droplet (#50). The same image runs the web app and the worker with different commands, configured entirely by an env file.

## Plan

- Next.js `output: 'standalone'`; multi-stage Dockerfile (bun install --frozen-lockfile, build, slim runtime, non-root user).
- One image; entrypoint picks the role: `web` (default), `worker`, `migrate` (runs migrations, then exits).
- `/api/health` (DB reachable, migrations current, worker heartbeat fresh) used by the Docker HEALTHCHECK.
- Config only from environment variables (the env file): varlock validates at boot and fails fast with a clear message; no `.env.local` or Tailscale `exec()` inside the image.
- `docker-compose.prod.yml` for the droplet: web, worker, migrate (one-shot, runs before web), `env_file: /etc/daily/daily.env`, restart policies, log rotation.
- Build locally and in CI; image labelled with the git sha.

## Notes

### 2026-11-10T03:25:51Z — claude-code (agent)

Shipped the image, roles web + migrate. No `worker` role yet, because no worker code exists; add it to docker/entrypoint.sh and the compose file when the sync/standup worker lands (#40/#44/#45). The /api/health worker-heartbeat check comes with it.

Decisions and dead ends:
- varlock: `@defaultDynamic=true` in .env.schema. Otherwise non-sensitive values (APP_ENV, BETTER_AUTH_URL, GITHUB_CLIENT_ID) are inlined at build time, and one image could not serve every environment. `varlockNextConfigPlugin({ freezeIntoBundle: false })` is required with `output: standalone`. The runtime boots via `varlock run` (CLI installed globally in the image) with the root .env.schema.
- The build stage must be node:22 + the bun binary. Under oven/bun, `next build` runs on Bun and fails while collecting page data ("Expected CommonJS module to have a function wrapper").
- `bun install --linker=hoisted` in the image: with Bun's isolated store, Next's standalone tracing missed @swc/helpers (Cannot find module at runtime).
- Build placeholders must be distinct (varlock rejects overlapping sensitive values), and BETTER_AUTH_URL must be https (the Better Auth MCP plugin). The image was scanned and contains no placeholder.
- Migrations in production: packages/db/scripts/migrate.ts is bundled with `bun build` to migrate.mjs (drizzle-orm migrator through the shared client). drizzle-kit stays dev-only.
- Health: services.health.check() compares the drizzle.__drizzle_migrations count with the bundled journal.

Verified with docker-compose.prod.yml locally (project daily-prodtest, port 3100): migrate exits 0 with 10 migrations applied; web is healthy; /api/health returns 200, and 503 with database "down" when postgres is stopped, recovering when it starts; / redirects 307 to /sign-in (200), static assets 200; the MCP protected-resource metadata uses the env's https domain; /api/mcp returns 401 unauthenticated; a missing BETTER_AUTH_URL exits 1 with varlock's message; an unknown role exits 64; no secret appeared in the logs.
