---
id: 53
title: "Postgres container on the droplet: volume, migrations on deploy, backups to DO Spaces"
state: Todo
parent: 49
labels: [infra, db]
blockedBy: [50]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T00:53:28Z
---

## Description

Production Postgres runs as a container in the droplet's compose stack (#50 ADR), so backups and restores are on us.

## Plan

- `postgres:17` service in docker-compose.prod.yml with a named volume (on a DO Block Storage volume so it survives droplet rebuilds), UTC, not published to the host network (internal compose network only).
- Credentials come from the env file; DATABASE_URL points at the compose service. No pooler needed (single app), so LISTEN/NOTIFY works on the normal connection.
- Migrations: the image's `migrate` role runs as a one-shot before web starts on every deploy.
- Backups: nightly `pg_dump -Fc` sidecar/cron → DigitalOcean Spaces (S3 API) with retention (e.g. 14 daily + 8 weekly); encrypted; alert on failure.
- A restore script plus a documented restore drill in the README; test it once against a scratch droplet.
- Optional: DO droplet weekly snapshots as a second safety net.
