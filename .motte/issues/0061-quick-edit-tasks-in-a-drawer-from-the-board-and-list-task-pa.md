---
id: 61
title: Quick-edit tasks in a drawer from the board and list (task page stays)
state: Done
assignee: Christopher Vachon
created: 2026-11-10T02:27:29Z
updated: 2026-11-10T02:32:16Z
---

## Notes

### 2026-11-10T02:32:16Z — claude-code (agent)

Shipped: board cards and list rows link to ?task=<n> (filters preserved via lib/drawer.ts). A server TaskDrawerSlot loads the detail via lib/task-detail.ts and renders a right Sheet (TaskDrawer) with the same TaskDetailView the /tasks/[ref] page uses. The editor grid uses a container query (@3xl) so it is 2-column on the page and stacks in the drawer. Close (Esc/overlay/X) does router.replace to the URL without ?task; "Open full page" is a real Link to /tasks/<n>. Verified with Playwright: open keeps filters, an edit saves and the board refreshes with the drawer still open, Esc closes, and Open full page navigates. No new MCP tools are needed (UI-only; it uses the existing task services and actions).
