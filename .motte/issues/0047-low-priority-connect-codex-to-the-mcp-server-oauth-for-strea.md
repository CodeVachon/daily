---
id: 47
title: "Low priority: connect Codex to the MCP server (OAuth for streamable HTTP)"
state: Done
parent: 7
labels: [mcp, priority:low]
blockedBy: [20, 21]
created: 2026-11-10T00:44:32Z
updated: 2026-11-10T01:36:54Z
---

## Description

Claude is used 95% of the time; do this when needed (#5, answer 5). Check whether Codex supports OAuth for remote streamable-HTTP MCP servers (DCR or CIMD), connect it, confirm its client name resolves to a "Codex" actor, and document it in the README.

## Notes

### 2026-11-10T01:36:54Z — Christopher Vachon (user)

Verified with codex-cli 0.160.1 in a throwaway CODEX_HOME (user's ~/.codex untouched): 'codex mcp add daily --url <tailnet>/api/mcp' + 'codex mcp login daily --no-browser' -> Codex discovers RFC 9728 metadata and uses CIMD (client_id https://chatgpt.com/oauth/codex/client.json, native app, loopback redirect). Our authorize endpoint accepts it (302 to /sign-in with the signed oauth query) and the cimd plugin stored the client as name 'Codex', so actors.forAgent labels its changes 'Codex'. Not done by me: the interactive browser step (GitHub sign-in + Allow) - that's the user's. README has the Codex setup. Note: the dev server must be running (a 502 from tailscale serve means it's down).
