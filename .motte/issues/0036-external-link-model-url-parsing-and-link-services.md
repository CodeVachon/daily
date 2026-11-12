---
id: 36
title: External link model, URL parsing and link services
state: Done
parent: 10
assignee: Christopher Vachon
labels: [db, integrations]
blockedBy: [14, 15]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T14:37:06Z
---

## Description

Store 1..n links per task with provider, key, url and cached remote state. Parse URLs and shorthand into provider + key.

## Plan

- `task_link` (id, task_id, provider github|jira|linear, kind issue|pr|ticket, key e.g. owner/repo#123 | PROJ-42 | ENG-7, url, remote_id, title, state, state_category open|closed|merged|draft|done, assignee, remote_updated_at, last_synced_at, sync_error, created + actor).
- `parseExternalRef(input)` handles GitHub issue/PR URLs, Jira Cloud browse URLs, Linear issue URLs and shorthand; table-driven tests.
- services.links: add (dedupe per task), remove, list, recordSync(state diff → link_synced event with actor=system:sync).
- Shared provider types in a new `packages/integrations`.

## Notes

### 2026-11-10T14:37:06Z — Christopher Vachon (user)

Done. parseExternalRef (db core, database-free): GitHub issue/PR URLs (any trailing path), owner/repo#N (kind starts as issue; sync corrects to pr), Jira Cloud /browse/ and ?selectedIssue= URLs (https *.atlassian.net only), bare PROJ-42 resolved against the connected Jira site's config.site. Linear dropped (GitHub + Jira only for now). task_link stores provider/kind/key/url plus a remote-state cache; unique(task, provider, key) so add() returns the existing link. services.links: list, add (link_added event), remove (user only, hard delete + link_removed event, like dependencies), recordSync (first sync fills the cache silently; later diffs of kind/title/state/stateCategory/assignee become link_synced events as system:sync; failures only set syncError). Not done here: which links are in scope for sync (#40 should only sync links whose repo/project is selected in Settings > Integrations).
