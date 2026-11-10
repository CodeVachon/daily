---
id: 16
title: Comments service with edit history
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [14, 15]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:17:42Z
---

## Description

Markdown comments by any actor (me or an agent).

## Plan

- `task_comment` (id, task_id, body md, actor columns, created_at, edited_at, deleted_at); `task_comment_revision` keeps prior bodies.
- services.comments: add, edit (stores a revision), delete (soft), list(taskId).
- Emits comment_* events. Tests.

## Notes

### 2026-11-10T01:17:42Z — Christopher Vachon (user)

Done: task_comment (body md, author jsonb Actor, created/edited/deleted) + task_comment_revision (previous bodies, replaced_at/by) - migration 0006. services.comments: list (oldest first, by task id/number), add (any actor), edit (author only: same actor type + OAuth client; agents can't edit the user's comments or each other's; previous body stored as a revision; no-op when unchanged), revisions, softDelete (user only). Events comment_added/edited/deleted. Added tasks.resolveId for ref lookups. 5 tests.
