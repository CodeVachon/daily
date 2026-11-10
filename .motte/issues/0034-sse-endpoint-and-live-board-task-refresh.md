---
id: 34
title: SSE endpoint and live board/task refresh
state: Todo
parent: 9
labels: [web]
blockedBy: [30, 33]
created: 2026-11-10T00:34:50Z
updated: 2026-11-10T00:35:26Z
---

## Description

GET /api/events (session-authenticated SSE) streams change notifications; the board, list and detail views refresh or patch in place.

## Plan

- Route handler with ReadableStream, heartbeat, reconnect with Last-Event-ID.
- Client hook `useLiveTasks` triggers router.refresh() or patches state; debounced.
- Highlight a card briefly when an agent changes it.
