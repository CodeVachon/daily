---
id: 49
title: "Epic: Deploy to DigitalOcean"
state: Todo
parent: 5
labels: [epic, infra]
created: 2026-11-10T00:45:00Z
updated: 2026-11-10T00:45:00Z
---

## Description

Run Daily in production on DigitalOcean (#5, answer 6): the web app (Next.js, SSE, MCP), the sync/standup worker, and Postgres, with secrets, migrations, CI/CD, backups and monitoring. Earlier work should stay deployable: long-lived processes, LISTEN/NOTIFY, and no reliance on this Mac (Tailscale exec, local Docker).

## Plan

Stories (children). The first is a decision that shapes the rest. Code-level prerequisites are noted on #33, #40 and #10.
