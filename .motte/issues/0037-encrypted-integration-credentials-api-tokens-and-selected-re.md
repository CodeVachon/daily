---
id: 37
title: Encrypted integration credentials (API tokens) and selected resources
state: Done
parent: 10
assignee: claude-code
labels: [db, integrations]
blockedBy: [12]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T13:44:57Z
---

## Description

Store per-provider credentials the user enters (GitHub PAT; Jira site + email + API token), encrypted at rest, plus the repositories/projects the user has put in scope. Chris (2026-11-10): credentials are entered on a Settings > Integrations page, not OAuth; only selected repos/projects are ever looked at.

## Plan

- `integration_connection` (id, user_id, provider github|jira, account label, config jsonb (non-secret: login, site, email), credentials_enc, connected_at, disconnected_at, timestamps); unique(user_id, provider).
- `integration_resource` (connection_id, external_id, key, name, url); unique(connection_id, external_id). Kept across disconnect so reconnecting restores the selection.
- AES-256-GCM (`packages/db/src/crypto.ts`), key `INTEGRATIONS_ENCRYPTION_KEY` (varlock, sensitive, required, base64 32 bytes), `v1:` prefix for rotation, AAD = user id + provider so rows can't be swapped.
- services.integrations: list (no secrets), connect (upsert, encrypt), credentials (decrypt), disconnect (wipe secret; user-only), setResources (replace selection).
- Tests: round-trip, tamper/AAD detection, wrong key, service behaviour.

## Notes

### 2026-11-10T13:44:56Z — claude-code (agent)

Done as planned. createServices(db, { encryptionKey }) takes the key lazily (tests use a fixed throwaway key in testing.ts), so nothing reads INTEGRATIONS_ENCRYPTION_KEY until a credential is sealed/opened. Disconnect is a soft delete of the secret only (credentials_enc = null, disconnected_at set) behind assertCanDelete, so agents can't; resources stay for reconnect. Dockerfile build step got a 32-byte placeholder key; added a real key to the local .env.local (gitignored).
