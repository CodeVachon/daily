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

## Every feature ships MCP tools

Claude agents work with this app's data through the MCP server at `/api/mcp`
(`packages/mcp`). **Any feature that adds or changes user-facing functionality
must add or update the matching MCP tools in the same change.** A feature without
its tools is not done.

- Put the feature's tools in `packages/mcp/src/tools/<feature>.ts` as a
  `ToolModule`, and add it to `toolModules` in `packages/mcp/src/tools/index.ts`.
- Scope every query to `ctx.userId` (the verified token's user). Never accept a
  user id as tool input.
- Give each tool a `description` an agent can act on, a zod `inputSchema`, an
  `outputSchema`, and `annotations` (`readOnlyHint`, `destructiveHint`, ...).
  Return results with `json(...)` so callers get structured content.
- Share data access with the UI (a function in the feature's package) rather
  than duplicating queries in the tool.
- Verify with `bun run mcp:smoke` (dev server running). It calls every no-arg
  tool. Extend `packages/mcp/scripts/smoke.ts` when a tool needs arguments.
