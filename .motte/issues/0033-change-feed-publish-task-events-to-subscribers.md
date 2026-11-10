---
id: 33
title: "Change feed: publish task events to subscribers"
state: Done
parent: 9
assignee: Christopher Vachon
labels: [db, web]
blockedBy: [14]
created: 2026-11-10T00:34:50Z
updated: 2026-11-10T15:29:48Z
---

## Description

After a write commits, publish its activity events so connected clients refresh. Must work when the writer is the Next app (UI/MCP) or the sync worker (separate process).

## Plan

- Postgres LISTEN/NOTIFY: the services NOTIFY `task_events` with {userId, taskId, eventId} after commit (inside packages/db).
- `services.changes.subscribe(userId, handler)` in db uses a dedicated listener connection.
- Tests with PGlite (it supports LISTEN/NOTIFY) or an injectable bus.

## Notes

### 2026-11-10T00:45:19Z — claude-code (agent)

Deployment constraint (#49): on DigitalOcean Managed Postgres the app may go through a transaction-mode connection pool, which breaks LISTEN/NOTIFY. Keep the listener on its own direct connection (DATABASE_DIRECT_URL, falling back to DATABASE_URL locally), and keep NOTIFY payloads tiny (ids only).

### 2026-11-10T15:29:48Z — Christopher Vachon (user)

Done. Migration 0013 (custom): AFTER INSERT trigger on task_event → pg_notify('task_events', {seq,userId,taskId,actorType,clientId}); delivered on commit, so every writer (web, MCP, sync worker) is covered without service changes. services.changes = createChangeFeed(listen): one LISTEN shared per process, fanned out per user, stops when the last subscriber leaves, failed listen retried on next subscribe. listen is injected via createServices options: postgres-js client.listen (dedicated connection; DATABASE_DIRECT_URL optional for a transaction-mode pooler) and PGlite client.listen in tests. Verified cross-process on the dev Postgres (writer process → listener process got both events in order). Also extracted schema/columns.ts taskOwned() (fallow dupes across comments/events/links).
