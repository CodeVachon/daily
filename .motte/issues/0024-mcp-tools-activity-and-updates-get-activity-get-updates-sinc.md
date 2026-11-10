---
id: 24
title: "MCP tools: activity and updates (get_activity, get_updates_since)"
state: Todo
parent: 7
labels: [mcp]
blockedBy: [14, 21]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T00:35:25Z
---

## Description

Agents read history: one task's timeline, or all changes since a cursor/time (optionally excluding their own), so an agent can catch up on what I changed.

## Plan

Wrap services.activity; return cursor for paging; tests.
