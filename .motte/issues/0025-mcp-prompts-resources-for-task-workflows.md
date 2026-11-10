---
id: 25
title: MCP prompts/resources for task workflows
state: Todo
parent: 7
labels: [mcp]
blockedBy: [21, 24]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T00:34:31Z
---

## Description

MCP prompts such as 'file a task from this conversation' and 'what should I work on next', plus resources (task by URI) so agents use the tools consistently.

## Plan

- Prompts: capture_task, triage_inbox, next_up.
- Resource template `daily://task/{id}`.
- Server instructions describe the status categories and priority scale.
