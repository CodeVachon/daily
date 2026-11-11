---
id: 74
title: Tasks with due dates on the calendar; drag to reschedule
state: Todo
parent: 70
labels: [web, calendar]
blockedBy: [69, 72, 73]
created: 2026-11-11T21:23:24Z
updated: 2026-11-11T21:23:27Z
---

## Description

Show tasks with due dates on the week and month views and drag them to change the due date/time.

## Plan

- Date-only due → all-day row / day cell; instant due → at its time. Meeting tasks (#69) shown once.
- dnd-kit drag: month → new date (keeps time), week → date + time (15-min snap). Meetings not draggable.
- Tests for drop → new due value.
