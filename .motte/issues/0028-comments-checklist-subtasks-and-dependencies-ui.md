---
id: 28
title: Comments, checklist, subtasks and dependencies UI
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [16, 17, 18, 27]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T01:57:49Z
---

## Description

Interactive sections on the task detail page: add/edit comments with history, checklist toggle/reorder, subtask list with status, a blocked-by picker.

## Plan

shadcn checkbox, command (task picker), tooltip, alert-dialog for deletes.

## Notes

### 2026-11-10T01:57:49Z — Christopher Vachon (user)

Done: task page sections - Checklist (Checkbox toggle, add via Enter, remove; done/total), Subtasks (link + status badge, add creates a child task, detach), Blocked by (open/resolved badges, Add blocker = Command popover task search by text or #n via searchTasksAction, remove), Comments (Markdown, agent badge, edit own comments only - lib/comments.ts toCommentView, delete with AlertDialog confirm). Server actions in app/(app)/tasks/collaboration-actions.ts (all via runAsUser + refresh). Shared client bits: useAction (toast on error), AddInput, Section. shadcn added: checkbox, alert-dialog. Checklist reordering is MCP/service-only for now (no drag UI). .prettierignore now skips generated env.ts. Verified with a one-off Playwright run exercising every section (events recorded, no console errors) + screenshots.
