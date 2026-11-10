---
id: 52
title: "Production configuration: env file for the container"
state: Todo
parent: 49
labels: [infra]
blockedBy: [50]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T00:52:14Z
---

## Description

Make env resolution work off this Mac.

## Plan

- The container receives every setting from one env file (`/etc/daily/daily.env` on the droplet, mode 600, owned by root). Document each variable from `.env.schema` in an `.env.production.example`, kept in sync by a test that diffs it against the schema.
- `APP_ENV=production`: `BETTER_AUTH_URL` must be set explicitly; the Tailscale `exec()` default must never run in the container (guard via `@currentEnv` / production overrides, plus a test).
- Secrets in the env file: BETTER_AUTH_SECRET, DATABASE_URL, INTEGRATIONS_ENCRYPTION_KEY, VAPID keys, OAuth client secrets. varlock marks them sensitive, so they are redacted from logs and errors.
- Separate production OAuth apps (GitHub sign-in now; integrations and Slack later). README lists the production callback URLs.
- Secure cookies for the production domain.
