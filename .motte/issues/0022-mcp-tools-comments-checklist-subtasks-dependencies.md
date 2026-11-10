---
id: 22
title: "MCP tools: comments, checklist, subtasks, dependencies"
state: Todo
parent: 7
labels: [mcp]
blockedBy: [16, 17, 18, 21]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T00:44:26Z
---

## Description

add_comment / edit_comment / list_comments, checklist add / update / toggle, create_subtask, add_dependency. Blocked on #16, #17 and #18. No delete or remove tools for agents (#5, answer 1): removing comments, checklist items or dependencies is UI-only.

## Plan

Thin wrappers over services; actor = agent; tests per tool.
