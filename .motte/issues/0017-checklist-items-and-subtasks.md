---
id: 17
title: Checklist items and subtasks
state: Todo
parent: 6
labels: [db]
blockedBy: [14, 15]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:34:19Z
---

## Description

Lightweight checklist inside a task, and parent/child subtasks.

## Plan

- `task_checklist_item` (id, task_id, text, done, position).
- services.checklist: add, update text, toggle, reorder, remove.
- Subtasks: tasks.create with parentTaskId; get returns children with status; reject parent cycles.
- Progress summary (done/total) for cards. Events + tests.
