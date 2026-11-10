---
id: 19
title: Projects and labels services
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
blockedBy: [12, 13]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T01:16:22Z
---

## Description

CRUD for projects and labels, and attaching labels to tasks.

## Plan

- services.projects: create/rename/recolor/archive/list.
- services.labels: create/rename/recolor/delete/list; tasks.setLabels(actor, id, labelIds) or add/remove, with events.
- Get-or-create label by name (useful for agents). Tests.

## Notes

### 2026-11-10T01:16:22Z — Christopher Vachon (user)

Done: services.projects (list incl. archived, get, create, update name/color/archived, softDelete user-only) and services.labels (list, create/update with case-insensitive uniqueness -> ValidationError, ensure(names) get-or-create for agents, setForTask(actor, taskId, labelIds) diffing label_added/label_removed events in one tx, softDelete user-only). Decision: assigning/unassigning labels on a task is an edit agents may make; deleting a label/project entity is user-only. Colours are a preset palette enum (catalog-inputs.ts). Lists sort case-insensitively. Deleted projects/labels are hidden from task summaries. 10 tests.
