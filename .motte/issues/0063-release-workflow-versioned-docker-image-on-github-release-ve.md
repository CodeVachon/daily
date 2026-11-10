---
id: 63
title: "Release workflow: versioned Docker image on GitHub Release; version shown in Settings"
state: Done
parent: 49
assignee: Christopher Vachon
created: 2026-11-10T03:31:37Z
updated: 2026-11-10T03:35:32Z
---

## Notes

### 2026-11-10T03:35:31Z — claude-code (agent)

Shipped. The release is the version source: tag vX.Y.Z → APP_VERSION=X.Y.Z build arg → image env, declared in .env.schema (default "dev"; process env overrides it under varlock run). GIT_SHA becomes APP_COMMIT. GHCR tags: X.Y.Z, X.Y, latest (only when the tag has no "-"), sha-short. linux/amd64 only (droplet). `workflow_dispatch` with a tag rebuilds an existing release.

CI needs no secrets: a clean clone with no .env.local passed typecheck, lint, test and fallow (env -i). actionlint (with shellcheck) is clean.

Verified: an image built with APP_VERSION=0.1.0 has the OCI labels, varlock passes APP_VERSION/APP_COMMIT through, and running it against the dev DB on :3200 renders Settings → About as "0.1.0 / 47fafd2 / production". The MCP initialize serverInfo.version is tested (release and dev). packages/mcp now generates src/env.ts (varlock) so next.ts can read APP_VERSION.

Not exercised yet: a real GitHub run. That needs the workflow on GitHub and a release published.
