---
id: 22
title: "MCP tools: comments, checklist, subtasks, dependencies"
state: Done
parent: 7
assignee: Christopher Vachon
labels: [mcp]
blockedBy: [16, 17, 18, 21]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T01:30:45Z
---

## Description

add_comment / edit_comment / list_comments, checklist add / update / toggle, create_subtask, add_dependency. Blocked on #16, #17 and #18. No delete or remove tools for agents (#5, answer 1): removing comments, checklist items or dependencies is UI-only.

## Plan

Thin wrappers over services; actor = agent; tests per tool.

## Notes

### 2026-11-10T01:30:45Z — Christopher Vachon (user)

Done (tools/collaboration.ts): list_comments, add_comment, edit_comment (author only - agents can't edit the user's comments), list_checklist, add_checklist_item, update_checklist_item (text/done/after; requires at least one), set_task_parent (attach/detach; create_task with parent creates subtasks), list_dependencies, add_dependency (cycles rejected). No remove/delete tools (UI-only). taskRef moved to tools/inputs.ts. 6 tests.
