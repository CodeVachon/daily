---
id: 20
title: "MCP: resolve calling agent as actor (client name) for every tool"
state: Todo
parent: 7
labels: [mcp]
blockedBy: [12]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T00:44:30Z
---

## Description

Turn the token's OAuth client into an `agent` actor (e.g. 'Claude Code') in McpContext, so every tool write is attributed. Codex verification is split out to a separate low-priority issue.

## Plan

- McpContext gains `actor` (agentActor via the oauthClients service, cached per request).
- whoami shows the resolved agent name.
- Tests for actor resolution in the MCP context.
