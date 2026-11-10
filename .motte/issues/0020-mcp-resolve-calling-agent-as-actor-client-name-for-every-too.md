---
id: 20
title: "MCP: resolve calling agent as actor (client name) for every tool"
state: Done
parent: 7
assignee: Christopher Vachon
labels: [mcp]
blockedBy: [12]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T01:25:28Z
---

## Description

Turn the token's OAuth client into an `agent` actor (e.g. 'Claude Code') in McpContext, so every tool write is attributed. Codex verification is split out to a separate low-priority issue.

## Plan

- McpContext gains `actor` (agentActor via the oauthClients service, cached per request).
- whoami shows the resolved agent name.
- Tests for actor resolution in the MCP context.

## Notes

### 2026-11-10T01:25:28Z — Christopher Vachon (user)

Done: McpContext now carries actor (services.actors.forAgent -> agent named after the OAuth client name, e.g. 'Claude Code', fallback client id) and the user's current timezone; contextFromAuthInfo is async and the handler factory awaits it. whoami returns client {id, name, scopes} and timezone. Added src/test-harness.ts (in-memory db + 'Claude Code' client + rpc/callTool through the real handler) for all tool tests; eslint allows @workspace/db/testing in test-harness.ts. Verified live via mcp:smoke (name = DCR client_name). Codex verification moved to #47.
