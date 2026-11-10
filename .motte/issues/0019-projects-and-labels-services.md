---
id: 19
title: Projects and labels services
state: Todo
parent: 6
labels: [db]
blockedBy: [12, 13]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:34:19Z
---

## Description

CRUD for projects and labels, and attaching labels to tasks.

## Plan

- services.projects: create/rename/recolor/archive/list.
- services.labels: create/rename/recolor/delete/list; tasks.setLabels(actor, id, labelIds) or add/remove, with events.
- Get-or-create label by name (useful for agents). Tests.
