---
id: 44
title: Standup generator (service + MCP tool)
state: Todo
parent: 11
labels: [db, mcp, notifications]
blockedBy: [14, 15]
created: 2026-11-10T00:35:16Z
updated: 2026-11-10T00:35:27Z
---

## Description

Build a standup draft from tasks and activity: done since the last standup, in progress, up next / due soon, blocked (with linked PRs/tickets).

## Plan

- services.standup.draft(userId, since) returns structured sections; formatter to Slack mrkdwn and Markdown.
- `standup_post` history table (posted_at, channel, body) so 'since last standup' works.
- MCP tool `draft_standup` (agents can draft or refine it).
- Tests on PGlite fixtures.
