---
id: 33
title: "Change feed: publish task events to subscribers"
state: Todo
parent: 9
labels: [db, web]
blockedBy: [14]
created: 2026-11-10T00:34:50Z
updated: 2026-11-10T00:45:19Z
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
