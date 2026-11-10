---
id: 57
title: "Public exposure hardening: Caddy TLS, security headers, rate limits"
state: Todo
parent: 49
labels: [infra, security]
blockedBy: [51]
created: 2026-11-10T00:53:35Z
updated: 2026-11-10T00:53:35Z
---

## Description

Production is public on a domain with TLS (#50 ADR), so the web UI, the OAuth/MCP endpoints and the sign-in flow are internet-facing. Access stays gated by the GitHub allowlist, but the surface needs hardening.

## Plan

- Caddy container in front of web: automatic Let's Encrypt TLS, HTTP→HTTPS, HSTS, compression, and SSE-friendly proxying (no response buffering on /api/events and /api/mcp).
- Droplet firewall (DO Cloud Firewall): only 80/443 public; SSH restricted (key-only, ideally via Tailscale or an IP allowlist); Postgres never published.
- Security headers (CSP, frame-ancestors none, referrer-policy) via Next config.
- Rate limits: Better Auth's built-in rateLimit (database storage) for /api/auth/*, especially sign-in, OAuth client registration (DCR is open) and token; per-token limits on /api/mcp.
- Housekeeping: a worker job purges unused OAuth clients that never completed authorization (DCR spam).
- `BETTER_AUTH_URL` = https://<domain>; trusted origins locked to it.
- Review: no debug endpoints, no stack traces to clients, and varlock leak detection stays on in production.
