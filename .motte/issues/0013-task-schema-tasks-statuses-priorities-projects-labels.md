---
id: 13
title: "Task schema: tasks, statuses, priorities, projects, labels"
state: Todo
parent: 6
labels: [db]
blockedBy: [12, 46]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:44:21Z
---

## Description

Tables and migration for the core task model (R1). Status as data so new columns can be added later.

## Plan

- `task_status` (key PK, name, category open|active|done|cancelled, position); seed Backlog, Todo, In Progress, Blocked, Done, Cancelled in the migration.
- `task` (id, user_id, title, description md, status_key FK, priority enum none|urgent|high|medium|low, due_at, due_has_time, project_id, parent_task_id, board_position, created/updated + actor columns, deleted_at soft delete).
- `project` (id, user_id, name, color, archived_at); `label` (id, user_id, name unique per user, color); `task_label` join.
- Indexes: (user_id, status_key, board_position), due_at, parent_task_id.
- Migration via db:generate; tested on PGlite.
