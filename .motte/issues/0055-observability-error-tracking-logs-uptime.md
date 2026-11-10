---
id: 55
title: "Observability: error tracking, logs, uptime"
state: Todo
parent: 49
labels: [infra]
blockedBy: [51]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T00:45:18Z
---

## Description

Know when production or the worker breaks.

## Plan

- Sentry for web (Next.js SDK) and worker; release tagging from CI.
- Structured logs (pino) for MCP calls (agent, tool, duration; never token values) and sync runs.
- Uptime check on /api/health; alert when the worker hasn't completed a sync cycle recently.
