---
id: 45
title: "Slack integration: OAuth connect and post standup"
state: Todo
parent: 11
labels: [integrations, notifications, web]
blockedBy: [37, 38, 44, 48]
created: 2026-11-10T00:35:16Z
updated: 2026-11-10T00:44:54Z
---

## Description

Connect Slack as a **bot** (OAuth, bot token with chat:write [+ users:read to resolve my user id]). Pick a channel, then preview, edit and post the standup rendered from the managed template (with my @mention). Optional daily schedule run by the worker.

## Plan

- Reuses provider_connection storage (#37) with provider=slack (bot token, team id, default channel).
- Posts as the app bot (`chat.postMessage` with the rendered template; the bot must be invited to the channel, so check and explain on failure).
- Standup page: draft → render with template → edit → post; history of posts (#44 standup_post).
- Schedule (time + weekdays, in my timezone #46) in settings; the worker posts or prepares a draft and pushes a reminder.
- MCP tool `post_standup` (requires explicit confirm text) so an agent can post on request.
- README: Slack app manifest (bot scopes, redirect URL) for local and production.
