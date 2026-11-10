---
id: 30
title: Kanban board with drag and drop
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [15, 26, 27]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T01:53:09Z
---

## Description

R3: columns per status (board order; Cancelled hidden), cards with priority, due (overdue highlighted), labels, project, link badges, blocked indicator, checklist progress, unread dot. Dragging between columns changes status; dragging within a column reorders.

## Plan

- dnd-kit (sortable) with optimistic updates; server action `moveTask`.
- Card built from shadcn card/badge/tooltip.
- Keyboard-accessible moves (dnd-kit sensors).
- Ordering logic (position between neighbours) lives in the db service; UI logic in tested lib helpers.

## Notes

### 2026-11-10T01:53:09Z — Christopher Vachon (user)

Done: Kanban with @dnd-kit/react 0.5 (DragDropProvider, useSortable with group=status column, useDroppable columns so empty columns accept drops) + @dnd-kit/helpers move(). Optimistic: board state moves on drag-over; on drop dropTarget(before, latest, id) computes {status, afterTaskId, beforeTaskId} -> moveTaskAction (services.tasks.move); failure reverts + toast. Cards built server-side via toBoardCard (due label, overdue/today flags in user's zone, priority icon, project, labels, open blockers, checklist/subtask progress); title links to detail page; drag from the card body. Gotchas: (1) keying the board by server version remounted it after each refresh() and dnd-kit's manager teardown logged 'useInsertionEffect must not schedule updates' - fixed by syncing state when version changes (adjust-state-during-render) instead of remounting; (2) use a ref for the latest arrangement in onDragEnd. Verified with a one-off Playwright drag test: cross-column (backlog->done, status_changed event) and in-column reorder both persist, no console errors. Keyboard dragging comes from dnd-kit's default KeyboardSensor (not separately tested).
