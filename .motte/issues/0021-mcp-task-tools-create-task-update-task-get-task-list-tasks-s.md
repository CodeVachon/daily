---
id: 21
title: "MCP task tools: create_task, update_task, get_task, list_tasks, search_tasks, move_task"
state: Todo
parent: 7
labels: [mcp]
blockedBy: [15, 20]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T00:44:24Z
---

## Description

The core read/write tools agents use to file and fetch work. Blocked on the task service (#15). **No delete tool**: agents cannot delete data (#5, answer 1). They can set status to Done/Cancelled.

## Plan

- Input schemas reuse the db zod schemas; status by key or category ('open', 'done'); priority enum; due date ISO 8601 (date-only or with offset; see #46).
- list_tasks filters mirror the UI (status/category, project, label, priority, due window); compact output by default, `include` for comments/activity. Soft-deleted tasks are never returned.
- get_task returns the full task: checklist, subtasks, blockers, links, recent activity.
- Annotations: readOnly for get/list/search; no destructive tools.
- A test asserting no registered tool can delete (tools/list has no delete_/remove_ tools, and the services reject agent actors).
- Tool tests via createMcpRequestHandler + PGlite; extend smoke.
