---
id: 41
title: Links UI and MCP link tools
state: Done
parent: 10
assignee: Christopher Vachon
labels: [web, mcp, integrations]
blockedBy: [21, 27, 36]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T15:11:14Z
---

## Description

Add/remove links on a task (paste a URL or shorthand), show provider icon, key, title and state badge. MCP: link_external, list_task_links, find_tasks_by_link (e.g. which task tracks owner/repo#123). No unlink tool: removing is a delete, so user only. Refresh (refresh_link) and board-card badges move to #40, once sync fills remote state.

## Plan

- lib/links.ts: toLinkView (label = title ?? key, state badge tone by category, sync error) with tests.
- Links section in the task view (page + drawer): list with icon (PR / issue / Jira ticket), external link, state badge, remove (user); AddInput "Paste a GitHub or Jira link…". Actions in app/(app)/tasks/link-actions.ts.
- MCP tools in packages/mcp/src/tools/links.ts; tests via the harness.

## Notes

### 2026-11-10T14:39:46Z — Christopher Vachon (user)

Done (minus refresh/board badges, moved to #40). Links section in the task view (page + drawer) between Blocked by and Comments: icon per PR / GitHub issue / Jira, title (else key) linking out, state badge once synced, red alert icon with tooltip on sync error, hover X to unlink (user only). AddInput accepts URLs or owner/repo#12 / PROJ-42. services.links.findTasks added. MCP: link_external, list_task_links, find_tasks_by_link; deliberately no unlink tool. ui-shot seeds three links on #3 (synced merged PR, unsynced issue, failing Jira).

### 2026-11-10T15:11:14Z — Christopher Vachon (user)

Fix (Chris, 2026-11-10): long Jira titles widened the drawer and pushed the sync-error marker off-screen, so a GitHub link looked like it had failed silently (it was out of scope: the connected GitHub account is useAppello with useAnzen/* repos selected). Rows are now 'KEY - Title' truncated, state badge right-aligned; a failed first sync shows a destructive 'Not synced' badge with the reason in a tooltip. Task detail grid uses grid-cols-[minmax(0,1fr)] so unbreakable content truncates.
