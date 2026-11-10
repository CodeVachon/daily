---
id: 40
title: "Sync worker: polling refresh of linked items"
state: Todo
parent: 10
labels: [integrations, infra]
blockedBy: [39]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T00:53:36Z
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
