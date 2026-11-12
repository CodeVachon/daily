---
id: 76
title: Resolve code review findings on the production image, release workflow and health check
state: Done
assignee: Christopher Vachon
labels: [infra]
created: 2026-11-10T22:25:38Z
updated: 2026-11-11T19:34:49Z
---

## Description

Ten findings from the review of PR #3: release.yml moves latest backwards and mislabels sha on dispatch; DATABASE_URL keeps a dev default in production; postgres container receives every app secret; health check hides errors and only counts migrations; HEALTHCHECK hardcodes port 3000; Dockerfile install layer never caches; packages/mcp lacks varlock dep/codegen; migrate.ts default folder is percent-encoded.

## Plan

1. release.yml: latest/X.Y only when the tag is the newest stable (overall / in its minor line); sha tag and revision label from the checked-out commit.
2. .env.schema: no DATABASE_URL default in production; placeholder in the Dockerfile build.
3. docker-compose.prod.yml: postgres gets only POSTGRES_PASSWORD; migrate healthcheck disabled.
4. health.ts: compare the journal against applied created_at; missing table = up with 0 applied; log unexpected errors. Tests.
5. Dockerfile: HEALTHCHECK uses PORT; manifests copied before install.
6. packages/mcp: varlock dependency, codegen in typecheck, pick=[APP_VERSION].
7. migrate.ts: fileURLToPath.
Verify: bun run check; docker build if docker is available.

## Notes

### 2026-11-11T19:34:48Z — Christopher Vachon (user)

Verified: typecheck, lint, fallow clean; vitest 304/304 with --maxWorkers=2 (default parallelism times out beforeAll hooks in unrelated files on this loaded 4-core machine). Built the image and ran the prod compose stack: health 200, postgres env has only POSTGRES_*, migrate healthcheck NONE, PORT=8080 stays healthy. Kept packages/mcp importing the whole schema: mcp:smoke runs auth+db under its varlock run, so pick=[APP_VERSION] would break it. Compose now needs --env-file for POSTGRES_PASSWORD interpolation.

### 2026-11-12T19:30:00Z — claude-code (agent)

Renumbered from #64 when merging main into drizzle-postgres-better-auth: the branch had already used #64 for "Board and list: show a (done/total) completion summary". Commit e7f78b8 and PR #5 still say #64.
