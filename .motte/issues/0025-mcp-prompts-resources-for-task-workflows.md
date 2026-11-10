---
id: 25
title: MCP prompts/resources for task workflows
state: Done
parent: 7
assignee: Christopher Vachon
labels: [mcp]
blockedBy: [21, 24]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T01:35:48Z
---

## Description

MCP prompts such as 'file a task from this conversation' and 'what should I work on next', plus resources (task by URI) so agents use the tools consistently.

## Plan

- Prompts: capture_task, triage_inbox, next_up.
- Resource template `daily://task/{id}`.
- Server instructions describe the status categories and priority scale.

## Notes

### 2026-11-10T01:35:48Z — Christopher Vachon (user)

Done (tools/workflows.ts): prompts capture_task(hint?) (search first, then create_task with context), triage_inbox (propose, confirm, then update_task; never delete), next_up (overdue/today/active, skip blocked); resource template daily://task/{ref} listing open tasks (most recently updated) and reading a task as Markdown (fields, description, checklist, subtasks, comments, last 10 events). Server instructions now explain #numbers, statuses/categories, priorities, due-date strings and the current time zone, attribution and the no-delete rule. README lists all tools/prompts/resources. 6 tests.
