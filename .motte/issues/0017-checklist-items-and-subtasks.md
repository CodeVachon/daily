---
id: 17
title: Checklist items and subtasks
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [14, 15]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:20:05Z
---

## Description

Lightweight checklist inside a task, and parent/child subtasks.

## Plan

- `task_checklist_item` (id, task_id, text, done, position).
- services.checklist: add, update text, toggle, reorder, remove.
- Subtasks: tasks.create with parentTaskId; get returns children with status; reject parent cycles.
- Progress summary (done/total) for cards. Events + tests.

## Notes

### 2026-11-10T01:20:05Z — Christopher Vachon (user)

Done: task_checklist_item lives in schema/tasks.ts (kept out of its own file to avoid a tasks<->checklist import cycle) - migration 0007. services.checklist: list, add (fractional position at end), rename, toggle (explicit or flip), reorder (after item / top), remove (user only). Events checklist_added/updated/toggled/removed, no-op writes skipped. Subtasks: create with parentTaskId (accepts #n) records subtask_added on the parent; tasks.setParent(actor, ref, parentRef|null) moves/attaches/detaches with updated(parentTaskId) on the child and subtask_added/detached on parents; cycles rejected by walking the parent chain (max depth 100). TaskSummary.progress = {checklist:{done,total}, subtasks:{done,total}} (cancelled/deleted subtasks excluded). 11 tests.
