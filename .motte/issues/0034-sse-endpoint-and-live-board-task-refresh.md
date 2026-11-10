---
id: 34
title: SSE endpoint and live board/task refresh
state: Done
parent: 9
assignee: Christopher Vachon
labels: [web]
blockedBy: [30, 33]
created: 2026-11-10T00:34:50Z
updated: 2026-11-10T15:53:02Z
---

## Description

GET /api/events (session-authenticated SSE) streams change notifications; the board, list and detail views refresh or patch in place.

## Plan

- Route handler with ReadableStream, heartbeat, reconnect with Last-Event-ID.
- Client hook `useLiveTasks` triggers router.refresh() or patches state; debounced.
- Highlight a card briefly when an agent changes it.

## Notes

### 2026-11-10T15:53:02Z — Christopher Vachon (user)

Done. GET /api/events (session cookie; 401 otherwise): lib/event-stream.ts eventStream() subscribes to services.changes first, then replays up to 50 missed events from activity.since for Last-Event-ID, sends each seq once, 'retry: 5000', ': ping' every 25s, unsubscribes on abort; x-accel-buffering: no for Caddy. Client: <LiveUpdates/> in the (app) layout opens EventSource and router.refresh()es via createRefreshScheduler (burst → one refresh after 400ms; while typing in a text field/textarea/contenteditable or while body[data-live-hold] (set during board drags) it retries every 1s, because TaskEditor is keyed by updatedAt and a refresh would remount it mid-edit). Board cards ring for 2.5s on agent/system changes; flash end times live in a module map so a card that moves column (remount) keeps it. Verified in Chromium: an agent edit + move from a separate process appeared on the open board without reload, card highlighted in its new column. Own UI changes refresh twice (action refresh() + SSE echo); harmless.
