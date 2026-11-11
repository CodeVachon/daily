---
id: 71
title: MCP tool for invitations (read-only)
state: Todo
parent: 65
labels: [mcp, calendar]
blockedBy: [67, 68]
created: 2026-11-10T18:45:24Z
updated: 2026-11-11T21:23:30Z
---

## Description

Agents can see the user's meetings and invitations but not answer them.

## Plan

- list_meetings, get_meeting and next_meeting ship with the week view (#72), per "every feature ships MCP tools".
- Here: list_invitations (needsAction, upcoming), read-only; agents never answer invitations.
- Tests through the MCP harness with fixture events.
