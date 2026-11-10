---
id: 13
title: "Task schema: tasks, statuses, priorities, projects, labels"
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [12, 46]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:08:23Z
---

## Description

Tables and migration for the core task model (R1). Status as data so new columns can be added later.

## Plan

- `task_status` (key PK, name, category open|active|done|cancelled, position); seed Backlog, Todo, In Progress, Blocked, Done, Cancelled in the migration.
- `task` (id, user_id, title, description md, status_key FK, priority enum none|urgent|high|medium|low, due_at, due_has_time, project_id, parent_task_id, board_position, created/updated + actor columns, deleted_at soft delete).
- `project` (id, user_id, name, color, archived_at); `label` (id, user_id, name unique per user, color); `task_label` join.
- Indexes: (user_id, status_key, board_position), due_at, parent_task_id.
- Migration via db:generate; tested on PGlite.

## Notes

### 2026-11-10T01:08:22Z — Christopher Vachon (user)

Done: schema/tasks.ts + migration 0003 (with status seed INSERT appended). task_status table (key,name,category enum open|active|done|cancelled,position) seeded backlog/todo/in_progress/blocked/done/cancelled; task_priority enum none|urgent|high|medium|low; project, label (case-insensitive unique live names via partial unique index on lower(name)), task (per-user number, floating due_date vs due_at+due_timezone enforced by checks, parent_task_id self FK, fractional board_position text, completed_at, created_by/updated_by/deleted_by as jsonb Actor, soft delete), task_label. Actor stored as jsonb on tasks; task_event (#14) gets explicit actor columns for querying. Full-text search column deferred to #15. Tests: seeds + constraints via raw SQL on PGlite.
