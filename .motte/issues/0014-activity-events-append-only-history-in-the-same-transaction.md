---
id: 14
title: "Activity events: append-only history in the same transaction"
state: Todo
parent: 6
labels: [db]
blockedBy: [12, 13]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:34:19Z
---

## Description

R2. A `task_event` table plus a recorder used by every service write.

## Plan

- `task_event` (id, task_id, user_id, at, actor columns, type, payload jsonb: {field, from, to} | {commentId} | {linkId, ...}).
- Types: created, updated(fields[]), status_changed, moved, comment_added/edited/deleted, label_added/removed, checklist_*, dependency_added/removed, link_added/removed/synced, deleted/restored.
- `recordEvents(tx, actor, taskId, changes)` computes the diff old → new for changed fields only.
- Service: `activity.forTask(taskId)`, `activity.since(userId, cursor, {excludeActor})` for the inbox, MCP and SSE.
- Tests: diff correctness and atomicity (a failed write leaves no event).
