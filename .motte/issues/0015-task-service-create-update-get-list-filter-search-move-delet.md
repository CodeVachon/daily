---
id: 15
title: "Task service: create, update, get, list/filter, search, move, delete"
state: Todo
parent: 6
labels: [db]
blockedBy: [13, 14]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:44:28Z
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
