---
id: 24
title: "MCP tools: activity and updates (get_activity, get_updates_since)"
state: Done
parent: 7
assignee: Christopher Vachon
labels: [mcp]
blockedBy: [14, 21]
created: 2026-11-10T00:34:31Z
updated: 2026-11-10T01:34:19Z
---

## Description

Agents read history: one task's timeline, or all changes since a cursor/time (optionally excluding their own), so an agent can catch up on what I changed.

## Plan

Wrap services.activity; return cursor for paging; tests.

## Notes

### 2026-11-10T01:34:19Z — Christopher Vachon (user)

Done (tools/activity.ts): get_activity(task, limit) newest first; get_updates_since(cursor, include_mine=false, actors, limit) oldest first, returns {events, cursor, hasMore} - pass cursor back to catch up; excludes the calling agent's own OAuth client by default. Events serialized with seq, ISO at, task {ref,title} (null if deleted), actor {type,name}, type, summary ('Chris moved it from todo to done'), details. describeEvent(payload) added to @workspace/db/events (exported via core) as an exhaustive typed lookup table (a switch exceeded fallow's complexity limit); reused later by the web timeline (#29). 4 tests.
