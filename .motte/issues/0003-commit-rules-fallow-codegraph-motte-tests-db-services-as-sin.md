---
id: 3
title: "Commit rules: fallow, codegraph, motte, tests, db services as single source of truth"
state: Done
assignee: Christopher Vachon
created: 2026-11-10T00:06:02Z
updated: 2026-11-10T00:06:57Z
---

## Notes

### 2026-11-10T00:06:40Z — Christopher Vachon (user)

Enforcement: .githooks/pre-commit -> scripts/check.sh (motte none In Progress, typecheck, lint --max-warnings 0, vitest --coverage, fallow --coverage). prepare script sets core.hooksPath. Tests: Vitest single root config (V8 coverage -> coverage/coverage-final.json for fallow CRAP); chose Vitest over bun test because fallow needs Istanbul/V8 coverage. Coverage limited to .ts (V8 remap can't parse JSX of unloaded .tsx); logic moved to lib/*.ts so .tsx stays thin.

### 2026-11-10T00:06:40Z — Christopher Vachon (user)

DB boundary: packages/db client.ts private; exports services (createServices(db) factory: users, oauthClients), authDatabaseAdapter for Better Auth, and ./testing (PGlite + migrations + seed). ESLint no-restricted-imports blocks drizzle-orm/postgres/drizzle-kit/pglite outside db and db/testing outside tests. Found: shared eslint base never matched .ts files (TS was unlinted) -> added files glob + typescript-eslint (replaced babel parser). CodeGen interpreted as CodeGraph (.codegraph dir + global CLI); added to .mcp.json with fallow-mcp from node_modules.

### 2026-11-10T00:06:40Z — Christopher Vachon (user)

Fallow fixes: removed unused template deps (lucide-react, next-themes/zod/@turbo/gen from ui), added postcss-load-config, ignoreExports for varlock env.ts helper types, apps/web/env.ts now used by next.config. Complexity findings resolved via tests + extracting gate/claims/consent/theme-hotkey helpers. Verified: bun run check green, gate blocks with In Progress issue (exit 1), mcp:smoke passes against dev server.

### 2026-11-10T00:06:57Z — Christopher Vachon (user)

Follow-up: renamed vitest.config.ts -> .mts (root package.json has no type:module; Vite warned about loading ESM config as CJS).
