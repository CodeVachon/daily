---
id: 70
title: "Calendar page: month and week views with meetings and due tasks; drag to reschedule"
state: Todo
parent: 65
labels: [web, calendar]
blockedBy: [67, 69]
created: 2026-11-10T18:45:24Z
updated: 2026-11-10T18:45:24Z
---

## Description

A Calendar in the app showing meetings and tasks with due dates; drag a task to change its due date/time.

## Plan

- /calendar (sidebar item). Month grid and week time grid, built from shadcn primitives (no scheduler in shadcn); browser time zone; today/next/prev; URL holds view + date.
- Meetings: blocks in week view (overlaps side by side), chips in month; declined hidden, tentative/needsAction styled differently; click → meeting detail sheet (from the RSVP story).
- Tasks with due dates: date-only due → all-day row (week) / day cell (month); instant due → at its time. Click → task drawer. Meeting tasks shown once (as the meeting, linked to its task).
- Drag a task (dnd-kit, already used on the board): month → new date (keeps time if it had one), week → new date + time (15-min snap). Meetings aren't draggable.
- Pure layout helpers (week grid placement, overlap columns, month cells across DST) in lib with tests; live refresh via the change feed.
- Also a 'Next: 14:30 Standup · Join' line in the sidebar.
