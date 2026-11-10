---
id: 37
title: Encrypted provider connections (OAuth token storage)
state: Todo
parent: 10
labels: [db, integrations]
blockedBy: [12]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T00:35:26Z
---

## Description

Store per-provider OAuth tokens encrypted at rest, with refresh.

## Plan

- `provider_connection` (id, user_id, provider github|atlassian|linear|slack, account label, scopes, access_token_enc, refresh_token_enc, expires_at, metadata jsonb e.g. Atlassian cloudId/site, created/updated).
- AES-256-GCM with a key from varlock (`INTEGRATIONS_ENCRYPTION_KEY`, sensitive, required); key-version prefix for rotation.
- services.connections: upsert, get (decrypts), disconnect, markInvalid. Tests: round-trip and tamper detection.
