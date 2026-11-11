---
id: 71
title: MCP tools for meetings (read-only)
state: Todo
parent: 65
labels: [mcp, calendar]
blockedBy: [67, 68]
created: 2026-11-10T18:45:24Z
updated: 2026-11-10T18:45:24Z
---

## Description

Agents can see the user's meetings and invitations but not answer them.

## Plan

- list_meetings (date range, default today; includes my response, Meet link, attendees), get_meeting (full details), next_meeting, list_invitations (needsAction).
- Read-only annotations; times in the user's zone like due dates.
- Tests through the MCP harness with fixture events.
