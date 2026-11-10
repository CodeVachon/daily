---
id: 18
title: Task dependencies (blocked by) with cycle detection
state: Todo
parent: 6
labels: [db]
blockedBy: [14, 15]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:34:19Z
---

## Description

'Blocked by' relationships between tasks.

## Plan

- `task_dependency` (task_id, blocked_by_task_id, PK both).
- services.dependencies: add (reject self and cycles via recursive CTE), remove, list blockers/blocking with open/closed state.
- tasks.get exposes `openBlockers`. Events + tests, including the cycle cases.
