---
id: 36
title: External link model, URL parsing and link services
state: Todo
parent: 10
labels: [db, integrations]
blockedBy: [14, 15]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T00:35:26Z
---

## Description

Store 1..n links per task with provider, key, url and cached remote state. Parse URLs and shorthand into provider + key.

## Plan

- `task_link` (id, task_id, provider github|jira|linear, kind issue|pr|ticket, key e.g. owner/repo#123 | PROJ-42 | ENG-7, url, remote_id, title, state, state_category open|closed|merged|draft|done, assignee, remote_updated_at, last_synced_at, sync_error, created + actor).
- `parseExternalRef(input)` handles GitHub issue/PR URLs, Jira Cloud browse URLs, Linear issue URLs and shorthand; table-driven tests.
- services.links: add (dedupe per task), remove, list, recordSync(state diff → link_synced event with actor=system:sync).
- Shared provider types in a new `packages/integrations`.
