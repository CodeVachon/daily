---
id: 15
title: "Task service: create, update, get, list/filter, search, move, delete"
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [13, 14]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:14:51Z
---

## Description

The core `services.tasks` API used by the UI and MCP. All writes take an actor and emit events.

## Plan

- create(actor, input) with zod validation in db (shared schemas exported for MCP/UI).
- update(actor, id, patch) with partial fields; emits field diffs.
- move(actor, id, {statusKey, beforeId/afterId}) for board ordering (fractional/lexorank positions).
- get(id) with labels, project, checklist, subtasks, blockers, link summaries, unread flag.
- list(filters: status/category, project, label, priority, due window, parent, text) and paginate. Excludes soft-deleted tasks unless `includeDeleted` (user-only Trash view).
- search(text): Postgres full-text on title + description (tsvector, GIN index).
- softDelete / restore: **user actor only** (`assertCanDelete`, #12); emits deleted/restored events. No hard delete in v1.
- Everything scoped to userId; tests on PGlite, including an agent delete being rejected.

## Notes

### 2026-11-10T01:14:51Z — Christopher Vachon (user)

Done: services.tasks = statuses, resolveStatus (key or category, helpful error), get (id | number | '#n', with status/project/labels/subtasks), create, update (field diffs incl. due; status change moves to end of new column; completedAt follows done category; no-op writes nothing), move (fractional-indexing between afterTaskId/beforeTaskId or bottom; status_changed vs reordered), list (status keys/categories, project, label, priority, due windows overdue/today/week/none in the user's stored zone, parent, full-text + #number, trash, order board/updated/due, limit/offset/hasMore), softDelete/restore (user only via assertCanDelete/assertCanRestore; agents get ForbiddenError). Shared zod inputs in src/task-inputs.ts (exported when MCP/UI consume them). Generated tsvector search column + GIN index (migration 0005). NotFoundError/ValidationError in src/errors.ts. Number allocation is max+1 inside the tx guarded by the unique index (single-user; retry not needed yet). 30 service tests on PGlite.
