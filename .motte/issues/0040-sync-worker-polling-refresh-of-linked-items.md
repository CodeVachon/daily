---
id: 40
title: "Sync worker: polling refresh of linked items"
state: Done
parent: 10
assignee: Christopher Vachon
labels: [integrations, infra]
blockedBy: [39]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T15:26:59Z
---

## Description

Background process that refreshes links every few minutes, plus on demand. Changes are written via services.links.recordSync and so appear in activity, live refresh and notifications.

## Plan

- New `apps/worker` (bun) with a simple scheduler: due links ordered by last_synced_at, per-provider concurrency and backoff, stale threshold (e.g. 5 min, open items more often than closed).
- On-demand: `services.links.requestRefresh` (DB flag/queue) used by task view and the MCP refresh_link tool.
- Run alongside dev (turbo dev) and as a service in production.
- Tests for scheduling/backoff logic.

## Notes

### 2026-11-10T00:45:21Z — claude-code (agent)

Deployment constraint (#49): the worker runs as its own long-lived process/container on DigitalOcean (an App Platform worker component or a compose service). Design it for one instance: a Postgres advisory lock so two never poll at once, graceful SIGTERM shutdown, and a heartbeat row so /api/health and alerting can tell when it has stalled. Also hosts the scheduled standup (#45).

### 2026-11-10T00:53:36Z — claude-code (agent)

Production is public on a domain (#50 ADR), so provider webhooks become possible later (GitHub/Linear/Jira → https://<domain>/api/webhooks/...). v1 keeps polling, since it works locally on the tailnet too. A follow-up could add webhooks in production with polling as the fallback.

### 2026-11-10T14:37:54Z — Christopher Vachon (user)

From #41: also ship refresh_link (MCP) and a Refresh button on the task's Links section, plus link state badges on board cards, once sync fills remote state. Only sync links whose repo (GitHub owner/repo) or project (Jira key prefix) is selected in Settings > Integrations; others show 'not in scope'.

### 2026-11-10T15:26:59Z — Christopher Vachon (user)

Done. apps/worker (bun; bundled to worker.mjs for the image): runWorker loop (injected deps, tested) every SYNC_POLL_SECONDS (60), each pass inside services.worker.exclusive('link-sync') = pg_try_advisory_xact_lock held for the pass's transaction (one instance syncs; others log 'skipped'), then a worker_heartbeat row. integrations.syncDue: services.links.dueForSync (SQL CASE: failing 15m, merged/done/closed 6h, else 5m; never-synced first; skips deleted tasks) → refreshLink per link, one at a time per provider, providers in parallel. /api/health adds worker {lastBeatAt, stale} without affecting ok (a dead worker must not restart web). SIGTERM/SIGINT abort the sleep; verified graceful stop locally (varlock run) and in the image (docker stop → exit 0). Compose: worker service, restart unless-stopped, healthcheck disabled (image HEALTHCHECK is web's). Board cards show up to 2 link badges (icon + state, key until synced) then +n. Not done: rate-limit/ETag handling (single user, low volume); webhooks later.
