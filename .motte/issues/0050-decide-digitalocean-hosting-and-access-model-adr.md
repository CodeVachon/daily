---
id: 50
title: Decide DigitalOcean hosting and access model (ADR)
state: Done
parent: 49
assignee: Christopher Vachon
labels: [infra, decision]
created: 2026-11-10T00:45:18Z
updated: 2026-11-10T00:53:50Z
---

## Description

Choose where it runs and who can reach it, and record it as an ADR.

## Plan

Options:
- A) **Droplet + Docker Compose + Tailscale**: same tailnet-only model as today (`tailscale serve` on the droplet), web + worker containers, DO Managed Postgres (or Postgres on the droplet). Private by default; no public attack surface; still no webhooks.
- B) **App Platform** (web service + worker component) + Managed Postgres, **public HTTPS** with the GitHub-allowlist gate in front of everything (MCP and OAuth endpoints become internet-facing). Managed builds and TLS; enables webhooks later.
- C) App Platform with a Tailscale sidecar/userspace networking (private, but more moving parts).
Criteria: security posture (single-user data, agent tokens), cost, ops effort, SSE/long-lived connection limits, LISTEN/NOTIFY, Web Push (needs HTTPS only), OAuth callback URLs.
Outcome: ADR in docs/adr + update this epic's stories.

## Notes

### 2026-11-10T00:52:06Z — claude-code (agent)

Decision from Chris (2026-11-09): **DigitalOcean Droplet** that **pulls a Docker image of this application**; configuration comes from an **env file passed into the container** (`docker run --env-file` / compose `env_file`). App Platform is out. Still open: how the droplet is reached (Tailscale on the droplet vs a public reverse proxy with TLS) and where Postgres runs (DO Managed Postgres vs a Postgres container on the droplet). Record the final answers in an ADR when this story is done.

### 2026-11-10T00:53:50Z — Christopher Vachon (user)

Decided (Chris, 2026-11-09): Droplet pulling one Docker image, env file passed into the container, public domain + TLS (Caddy), Postgres container on the droplet. ADR written: docs/adr/0001-production-deployment.md. Registry choice deferred to #54.
