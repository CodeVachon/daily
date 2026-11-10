# ADR 0001: Production deployment on a DigitalOcean Droplet

- Status: Accepted (2026-11-09)
- Tracking: motte #49 (epic), #50 (this decision)

## Context

Daily is a single-user task manager. Claude agents reach it over MCP, and it has a background
worker for syncing GitHub/Jira/Linear and posting the Slack standup. Locally it runs on a
tailnet-only HTTPS URL via `tailscale serve`. It needs a production home on DigitalOcean.

## Decision

1. **Compute: one DigitalOcean Droplet running Docker Compose.** The Droplet pulls a single Docker
   image of this application. The same image runs as `web`, `worker`, and a one-shot `migrate`
   role.
2. **Configuration: one env file passed into the containers** (`env_file: /etc/daily/daily.env`,
   root-owned, mode 600). varlock validates it at boot against `.env.schema`. Nothing is baked into
   the image, and the Tailscale-based defaults never run in production (`BETTER_AUTH_URL` is set
   explicitly).
3. **Access: a public domain with TLS.** Caddy terminates TLS (Let's Encrypt) and proxies to `web`.
   The app stays gated by the GitHub allowlist (users) and OAuth (MCP agents), and the internet-facing
   surface is hardened (#57).
4. **Database: a Postgres container on the Droplet.** It sits on the internal compose network only,
   with data on a DO Block Storage volume and nightly `pg_dump` backups to DO Spaces with retention
   and a tested restore (#53).

## Consequences

- Production URLs differ from local ones, so each environment has its own OAuth apps (GitHub
  sign-in now; integrations and Slack later).
- Being public allows provider webhooks later; v1 keeps polling so local and production behave the
  same.
- No connection pooler: LISTEN/NOTIFY works on the normal connection (single app instance).
- Backups and restores, OS patching, and Docker upkeep are our responsibility (no managed DB).
- CI builds and pushes the image, and the Droplet pulls it on deploy, running migrations first
  (#54). Image registry: DigitalOcean Container Registry or GHCR, decided in #54.

## Alternatives considered

- **App Platform**: rejected in favour of a Droplet running our own image.
- **Tailscale-only access**: rejected; a public domain was chosen.
- **DO Managed Postgres**: rejected for now in favour of a container (cost and simplicity); can
  migrate later by changing `DATABASE_URL`.
