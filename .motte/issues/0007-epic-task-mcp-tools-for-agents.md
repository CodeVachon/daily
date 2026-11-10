---
id: 7
title: "Epic: Task MCP tools for agents"
state: Done
parent: 5
labels: [epic, mcp]
blockedBy: [6]
created: 2026-11-10T00:33:59Z
updated: 2026-11-10T01:36:55Z
---

## Description

R7 from #5. Agents (Claude Code, Codex) create, read, update and search tasks, and handle comments, checklist, dependencies, projects and labels, through MCP. All writes are attributed to the calling agent's OAuth client.

## Notes

### 2026-11-10T01:36:55Z — Christopher Vachon (user)

Epic complete (2026-11-09): agent actor attribution (#20), task tools (#21), collaboration tools (#22), projects/labels (#23), activity/catch-up (#24), prompts/resources/instructions (#25), Codex compatibility verified up to the interactive login (#47). 30 tools, 3 prompts, 1 resource template; no delete tools. Tests drive the real MCP handler against PGlite.
