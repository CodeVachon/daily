---
id: 23
title: "MCP tools: projects and labels"
state: Done
parent: 7
assignee: Christopher Vachon
labels: [mcp]
blockedBy: [19, 21]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T01:32:10Z
---

## Description

list/create projects, list/create labels, set_task_labels (get-or-create by name). Blocked on #19.

## Plan

Thin wrappers; label names are case-insensitive; tests.

## Notes

### 2026-11-10T01:32:10Z — Christopher Vachon (user)

Done (tools/catalog.ts): list_projects, create_project, update_project (by name or id; rename/recolour/archive), list_labels, create_label, update_label (by name or id), set_task_labels (names, created if missing; [] clears). Colours = COLORS palette, now exported from @workspace/db/core. No delete tools. 4 tests.
