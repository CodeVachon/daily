---
id: 30
title: Kanban board with drag and drop
state: Todo
parent: 8
labels: [web]
blockedBy: [15, 26, 27]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T00:35:26Z
---

## Description

R3: columns per status (board order; Cancelled hidden), cards with priority, due (overdue highlighted), labels, project, link badges, blocked indicator, checklist progress, unread dot. Dragging between columns changes status; dragging within a column reorders.

## Plan

- dnd-kit (sortable) with optimistic updates; server action `moveTask`.
- Card built from shadcn card/badge/tooltip.
- Keyboard-accessible moves (dnd-kit sensors).
- Ordering logic (position between neighbours) lives in the db service; UI logic in tested lib helpers.
