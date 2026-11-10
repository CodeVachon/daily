<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- motte:start -->

## Tracking work with motte

This project's work lives in `.motte/issues/` as Markdown files, committed alongside the code. Track
work there rather than in an ad-hoc TODO list, a commit message, or a pull request description.

Start by asking what to do:

```
motte next --why
```

That is not `motte list`, and not quite `motte ready` either. **Ready** means unsettled with every
blocker settled; `next` orders that set by what a piece of work would unblock, how close it is to a leaf,
and how long it has waited — and it leaves out anything somebody else holds. `motte ready --blocked` shows
what is waiting and on what.

The loop for an issue you pick up:

1. Claim it — `motte claim <ref>`. If that fails, somebody else is on it: ask `motte next` again.
2. Read it — `motte show <ref>`
3. Refine its **Plan** if the plan on the file is not what you are actually going to do
4. Add notes as you go, especially for decisions and dead ends — `motte note <ref> "..."`
5. Move it to Done when the verification for that issue passes, or `motte release <ref>` if you stop

A `<ref>` is an issue number or a fragment of the title, so `motte show parser` works as well as
`motte show 12`.

If you discover a prerequisite mid-task, record it with `motte block <ref> <blocker>` rather than
describing it in prose. Prose is not queryable, and `motte ready` is what the next agent reads.

Every read command accepts `--json`. The MCP server exposes the same operations, and notes written
through it are attributed to the agent rather than to the repository's git user — which is the point:
one shared record of who decided what.

<!-- motte:end -->

## Commit rules

These are enforced by the pre-commit hook (`.githooks/pre-commit` → `scripts/check.sh`,
installed by `bun install`). Run `bun run check` yourself before committing. **Never bypass the
hook with `--no-verify`.** If a check fails, fix the cause; do not weaken the check.

1. **Close the motte issue first.** Every change is tracked in motte (see above). Before committing,
   move the issue to Done (`motte move <ref> Done`) once its verification passes, or
   `motte release <ref>` if you are stopping. The hook fails while any issue is In Progress.
2. **Tests are written and passing.** New or changed behaviour ships with Vitest tests
   (`*.test.ts` next to the code). `bun run test` runs the whole monorepo with coverage. Keep
   logic in `.ts` modules (services, `lib/`, pure helpers) so it can be tested; keep `.tsx`
   components thin.
3. **All Fallow issues are resolved.** `bun run fallow` (dead code, unused dependencies,
   duplication, complexity and CRAP scored against real test coverage) must report no issues.
   Fix findings: delete dead code, remove unused dependencies, test or simplify complex code.
   Only suppress (`// fallow-ignore-next-line <rule>` or `.fallowrc.json`) generated code, with a
   comment saying why.
4. **Typecheck and lint are clean.** `bun run typecheck`, and `bun run lint` with zero warnings.

## Use the code-intelligence MCP servers

`.mcp.json` configures these; use them before falling back to grep and reading files:

- **CodeGraph** (`codegraph`): explore the codebase. Find symbols, callers and callees, and the
  impact of a change before editing. `codegraph sync` refreshes the index (`codegraph init` on a
  fresh clone). Install: `npm i -g @colbymchenry/codegraph`.
- **Fallow** (`fallow`): check architecture and health while you work, not just at commit time.
  Before deleting "unused" code or dependencies, trace it with Fallow.
- **shadcn** (`shadcn`): search and add UI components (see "UI" below).
- **motte**: issue tracking (above).

## Data access: `@workspace/db` services are the single source of truth

Only services in `packages/db` may talk to the database.

- The connection (`packages/db/src/client.ts`) is private. The package exports `services`
  (`users`, `oauthClients`, ...), types, and the Better Auth storage adapter. Nothing else.
- Need data? Add or extend a service in `packages/db/src/services/<domain>.ts`, register it in
  `createServices`, and test it in `<domain>.test.ts` against
  `createTestDatabase()` from `@workspace/db/testing` (in-memory PGlite with every migration).
- ESLint blocks `drizzle-orm`, `postgres`, `drizzle-kit` and PGlite imports outside `packages/db`,
  and blocks `@workspace/db/testing` outside test files.
- Schema changes: edit `packages/db/src/schema/*`, then `bun run db:generate` and
  `bun run db:migrate`.

## UI: use shadcn components, don't rebuild them

Build UI from shadcn components (`base-maia` style on Base UI, in `packages/ui`). Don't hand-roll
anything shadcn already provides: buttons, cards, alerts, avatars, badges, dialogs, dropdowns,
forms and inputs, tables, tabs, tooltips, skeletons, spinners, and so on.

- **Look first.** Use the **shadcn MCP server** (`.mcp.json`) to search the registry, read
  examples, and get the add command. `bunx shadcn docs <component>` works too.
- **Add, don't copy.** From `apps/web`, run `bunx shadcn@latest add <component>`. Components land
  in `packages/ui/src/components/` and are imported as `@workspace/ui/components/<name>`.
- **Compose and extend.** Use the component's variants, `className` and composition. If you need
  something new, build it in `packages/ui` from shadcn primitives rather than one-off markup in a
  page. Edit a generated component only to change it for the whole app.
- **Icons** come from `lucide-react` (the configured icon library).
- Plain layout (`div` with flex/grid utilities, headings, text) is fine. Interactive or styled
  widgets are not.

## Every feature ships MCP tools

Claude agents work with this app's data through the MCP server at `/api/mcp`
(`packages/mcp`). **Any feature that adds or changes user-facing functionality
must add or update the matching MCP tools in the same change.** A feature without
its tools is not done.

- Put the feature's tools in `packages/mcp/src/tools/<feature>.ts` as a
  `ToolModule`, and add it to `toolModules` in `packages/mcp/src/tools/index.ts`.
- Read and write data only through `ctx.services` (see "Data access"), scoped to
  `ctx.userId` (the verified token's user). Never accept a user id as tool input.
- Give each tool a `description` an agent can act on, a zod `inputSchema`, an
  `outputSchema`, and `annotations` (`readOnlyHint`, `destructiveHint`, ...).
  Return results with `json(...)` so callers get structured content.
- The UI and the tools share the same `@workspace/db` service; never duplicate a
  query in a tool.
- Test tools through `createMcpRequestHandler(services)` against
  `createTestDatabase()` (see `packages/mcp/src/tools/system.test.ts`).
- Verify with `bun run mcp:smoke` (dev server running). It calls every no-arg
  tool. Extend `packages/mcp/scripts/smoke.ts` when a tool needs arguments.
