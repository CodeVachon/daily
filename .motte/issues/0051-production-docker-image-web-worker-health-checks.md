---
id: 51
title: Production Docker image (web + worker), health checks
state: Todo
parent: 49
labels: [infra]
blockedBy: [50]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T00:52:10Z
---

## Description

One Docker image of the application, pulled by the Droplet (#50). The same image runs the web app and the worker with different commands, configured entirely by an env file.

## Plan

- Next.js `output: 'standalone'`; multi-stage Dockerfile (bun install --frozen-lockfile, build, slim runtime, non-root user).
- One image; entrypoint picks the role: `web` (default), `worker`, `migrate` (runs migrations, then exits).
- `/api/health` (DB reachable, migrations current, worker heartbeat fresh) used by the Docker HEALTHCHECK.
- Config only from environment variables (the env file): varlock validates at boot and fails fast with a clear message; no `.env.local` or Tailscale `exec()` inside the image.
- `docker-compose.prod.yml` for the droplet: web, worker, migrate (one-shot, runs before web), `env_file: /etc/daily/daily.env`, restart policies, log rotation.
- Build locally and in CI; image labelled with the git sha.
