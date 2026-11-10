---
id: 18
title: Task dependencies (blocked by) with cycle detection
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [14, 15]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:21:23Z
---

## Description

'Blocked by' relationships between tasks.

## Plan

- `task_dependency` (task_id, blocked_by_task_id, PK both).
- services.dependencies: add (reject self and cycles via recursive CTE), remove, list blockers/blocking with open/closed state.
- tasks.get exposes `openBlockers`. Events + tests, including the cycle cases.

## Notes

### 2026-11-10T01:21:23Z — Christopher Vachon (user)

Done: task_dependency (task_id blocked by blocked_by_task_id, created_by, check not self, PK pair) in schema/tasks.ts - migration 0008; relations blockers/blocking. services.dependencies: list -> {blockedBy, blocking} with open flag (category open|active), add (any actor; self rejected; cycle detection by BFS upstream over blocked-by edges; duplicates ignored without a second event), remove (user only; deletes the join row, history keeps dependency_removed - same as label unassignment, re-add restores). TaskSummary.openBlockers counts live open blockers. 4 tests.
