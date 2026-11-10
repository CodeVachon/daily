---
id: 35
title: Unread state and Updates inbox
state: Todo
parent: 9
labels: [db, web, mcp]
blockedBy: [14, 30, 33]
created: 2026-11-10T00:34:50Z
updated: 2026-11-10T00:35:26Z
---

## Description

A task is unread when it has events by another actor since I last viewed it. Inbox page lists recent agent and sync changes, grouped by task, with mark-read / mark-all-read.

## Plan

- `task_read` (user_id, task_id, last_read_at); services.unread: markRead, unreadTaskIds, inbox(cursor).
- Viewing a task marks it read; unread dot on cards; inbox count badge in the nav.
- MCP: none needed for reads (agent-side), but get_updates_since covers agents.
- Tests.
