---
id: 14
title: "Activity events: append-only history in the same transaction"
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [12, 13]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:10:04Z
---

## Description

R2. A `task_event` table plus a recorder used by every service write.

## Plan

- `task_event` (id, task_id, user_id, at, actor columns, type, payload jsonb: {field, from, to} | {commentId} | {linkId, ...}).
- Types: created, updated(fields[]), status_changed, moved, comment_added/edited/deleted, label_added/removed, checklist_*, dependency_added/removed, link_added/removed/synced, deleted/restored.
- `recordEvents(tx, actor, taskId, changes)` computes the diff old → new for changed fields only.
- Service: `activity.forTask(taskId)`, `activity.since(userId, cursor, {excludeActor})` for the inbox, MCP and SSE.
- Tests: diff correctness and atomicity (a failed write leaves no event).

## Notes

### 2026-11-10T01:10:04Z — Christopher Vachon (user)

Done: task_event table (seq identity cursor, task_id, user_id, at, actor_type enum + actor_user_id/client_id/label columns, type, payload jsonb; indexes by task, user, user+actor_type) - migration 0004. src/events.ts: TaskEventPayload discriminated union (created, updated{changes}, status_changed, reordered, deleted/restored, comment_*, label_*, checklist_*, subtask_*, dependency_*, link_*, link_synced{changes}) + diffFields (date/array aware). services/activity.ts: recordEvents(tx, actor, taskId, payloads) for use inside service transactions; services.activity.forTask (newest first) and since(userId, {after cursor, actorTypes, excludeClientId, limit}) -> {events, nextCursor}. TestDatabase now exposes db + seed.task. Tests incl. transaction rollback atomicity.
