---
id: 35
title: Unread state and Updates inbox
state: Done
parent: 9
assignee: Christopher Vachon
labels: [db, web, mcp]
blockedBy: [14, 30, 33]
created: 2026-11-10T00:34:50Z
updated: 2026-11-10T15:57:16Z
---

## Description

A task is unread when it has events by another actor since I last viewed it. Inbox page lists recent agent and sync changes, grouped by task, with mark-read / mark-all-read.

## Plan

- `task_read` (user_id, task_id, last_read_at); services.unread: markRead, unreadTaskIds, inbox(cursor).
- Viewing a task marks it read; unread dot on cards; inbox count badge in the nav.
- MCP: none needed for reads (agent-side), but get_updates_since covers agents.
- Tests.

## Notes

### 2026-11-10T15:57:16Z — Christopher Vachon (user)

Done. task_read (user, task, last_read_seq) + inbox_state (user, cleared_seq) — positions are task_event seqs, not times. Unread = events by agent/system with seq > greatest(task's last_read_seq, cleared_seq), tasks not deleted; the user's own events never count. services.inbox: count, unreadTaskIds, list (tasks newest first, unread count, newest N unread events), markRead (to the task's latest seq), markAllRead. Web: 'Updates' nav item with SidebarMenuBadge count; unread dot on board cards and list rows; /updates page (cards per task with unread timeline, Mark read, Mark all read, opens the task drawer); opening a task (page or drawer) marks it read via a client effect + server action (refresh() updates the badge) rather than a write during render. MCP: list_unread_updates (read-only; agents can't mark read). Note: before this ships every past agent change counts as unread; 'Mark all read' once clears history. Also fixed: #34's card flash ring colour had overridden every card's border.
