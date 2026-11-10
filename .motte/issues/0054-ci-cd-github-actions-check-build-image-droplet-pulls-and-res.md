---
id: 54
title: "CI/CD: GitHub Actions check, build image, droplet pulls and restarts"
state: Todo
parent: 49
labels: [infra]
blockedBy: [51, 52, 53]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T00:52:17Z
---

## Description

Every push runs the same checks as the pre-commit hook; main deploys.

## Plan

- Workflow on every push: bun install, typecheck, lint, test (coverage), fallow. The motte gate is skipped in CI (local workflow rule).
- On main: build the Docker image, tag with the git sha and `latest`, and push to a registry (DigitalOcean Container Registry or GHCR; decide in #50's ADR).
- Deploy: SSH to the droplet (deploy key in GitHub secrets) or a pull-based updater; `docker compose pull` → run `migrate` → `up -d` web + worker; wait for /api/health; roll back to the previous tag on failure.
- The env file stays on the droplet; CI never sees production secrets except the deploy credentials.
