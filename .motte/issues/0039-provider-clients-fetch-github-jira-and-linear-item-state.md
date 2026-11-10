---
id: 39
title: "Provider clients: fetch GitHub, Jira and Linear item state"
state: Todo
parent: 10
labels: [integrations]
blockedBy: [36, 37]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T00:35:07Z
---

## Description

Minimal API clients that return normalized state for a link, handling token refresh and rate limits.

## Plan

- GitHub REST/GraphQL: issue/PR title, state, merged, draft, assignee, updated_at; batch via GraphQL; respect rate limit headers; ETag/If-None-Match.
- Jira Cloud REST v3: issue summary, status (category), assignee, updated.
- Linear GraphQL: issue title, state type, assignee, updatedAt.
- Normalized `RemoteItemState`; recorded fixtures for tests (no network in tests).
