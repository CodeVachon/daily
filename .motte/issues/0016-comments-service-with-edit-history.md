---
id: 16
title: Comments service with edit history
state: Todo
parent: 6
labels: [db]
blockedBy: [14, 15]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:34:19Z
---

## Description

Markdown comments by any actor (me or an agent).

## Plan

- `task_comment` (id, task_id, body md, actor columns, created_at, edited_at, deleted_at); `task_comment_revision` keeps prior bodies.
- services.comments: add, edit (stores a revision), delete (soft), list(taskId).
- Emits comment_* events. Tests.
