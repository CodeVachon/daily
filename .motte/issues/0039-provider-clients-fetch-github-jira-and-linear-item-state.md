---
id: 39
title: "Provider clients: fetch GitHub, Jira and Linear item state"
state: Done
parent: 10
assignee: Christopher Vachon
labels: [integrations]
blockedBy: [36, 37]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T14:56:50Z
---

## Description

Minimal API clients that return normalized state for a link, handling token refresh and rate limits.

## Plan

- GitHub REST/GraphQL: issue/PR title, state, merged, draft, assignee, updated_at; batch via GraphQL; respect rate limit headers; ETag/If-None-Match.
- Jira Cloud REST v3: issue summary, status (category), assignee, updated.
- Linear GraphQL: issue title, state type, assignee, updatedAt.
- Normalized `RemoteItemState`; recorded fixtures for tests (no network in tests).

## Notes

### 2026-11-10T14:56:50Z — Christopher Vachon (user)

Done. Provider.fetchItem + scopeOf: GitHub GET /repos/{owner}/{repo}/issues/{n} (returns issues and PRs; pull_request.merged_at → merged, draft → draft, closed+completed issue → done, other closed → closed; kind corrected to pr). Jira GET /rest/api/3/issue/{KEY}?fields=summary,status,assignee,updated (statusCategory done → done, else open), only on the connected site. integrations.refreshLink(userId, linkId): no connection / repo-or-project not selected / provider errors become syncError via services.links.recordSync, never throws for provider reasons. Wired on demand: adding a link (web + MCP link_external) fetches immediately; Links section has a Refresh button; MCP refresh_links. Verified against real GitHub (CodeVachon/daily#1, #3 → merged PRs with titles; #9999 → 404 message; unselected repo → scope message). Jira not exercised live (no credentials). Not done: rate-limit/ETag handling and batching; leave to #40's poller if needed.
