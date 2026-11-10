---
id: 1
title: Set up Drizzle/Postgres, varlock env, and GitHub-gated Better Auth
state: Done
created: 2026-11-09T22:41:53Z
updated: 2026-11-09T23:32:08Z
---

## Notes

### 2026-11-09T22:41:53Z — Christopher Vachon (user)

Gate: wrapped stock better-auth github().getUserInfo in packages/auth; returns null for logins not in AUTH_GITHUB_ALLOWED_USERS, so callback redirects with unable_to_get_user_info before any DB write. Chose this over databaseHooks.user.create (only fires on sign-up) and throwing in mapProfileToUser (yields a JSON error, not a redirect). Existing sessions are not revoked when a login is removed.

### 2026-11-09T22:41:53Z — Christopher Vachon (user)

Varlock: root .env.schema shared; per-package schemas @import(../../) with @generateTsTypes(exposeEnv=local). @next/env overridden via bun overrides; DATABASE_URL needs url(allowedProtocols=[postgres,postgresql]). Verified: typecheck/lint green, migration applied to docker postgres, dev server redirects / -> /sign-in and generates GitHub authorize URL. Real GitHub round-trip not tested (no OAuth app creds).

### 2026-11-09T22:46:20Z — Christopher Vachon (user)

AUTH_GITHUB_ALLOWED_USERS now defaults to codevachon in .env.schema (per user request); override in .env.local.

### 2026-11-09T23:32:08Z — Christopher Vachon (user)

Tailscale: TAILSCALE_URL=exec(scripts/tailscale.sh url) (@required=false, else empty exec fails validation and breaks fallback); BETTER_AUTH_URL=fallback(ref(TAILSCALE_URL), localhost). tailscale serve --bg --https=443 -> 127.0.0.1:3000 enabled on this machine. Verified / redirect, sign-in page, GitHub redirect_uri, and dev assets over https://<host>.ts.net.
