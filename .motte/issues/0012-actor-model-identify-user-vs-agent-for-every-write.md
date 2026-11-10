---
id: 12
title: "Actor model: identify user vs agent for every write"
state: Done
parent: 6
assignee: Christopher Vachon
labels: [db]
created: 2026-11-10T00:34:19Z
updated: 2026-11-10T00:54:44Z
---

## Description

Represent who made a change: `{ type: 'user' | 'agent' | 'system', userId, oauthClientId?, label }`. Agent label comes from the OAuth client name (Claude Code, Codex); system actors are e.g. 'sync' and 'standup'.

## Plan

- `actor` columns pattern (actor_type, actor_user_id, actor_client_id, actor_label) reused by tasks/comments/events.
- Services take an `Actor` argument on every write; no implicit actor.
- Helpers: `userActor(session)`, `agentActor(ctx)` (MCP: client id plus a client-name lookup via oauthClients service), `systemActor('sync')`.
- **Deletion policy**: `assertCanDelete(actor)`. Only `user` actors may delete or remove any entity (soft delete, restorable). Agents and system actors get a typed `ForbiddenError`. Every remove/delete service method calls it.
- Tests: actor resolution (unknown client id falls back to the id), and the deletion policy for each actor type.

## Notes

### 2026-11-10T00:54:44Z — Christopher Vachon (user)

Done: packages/db/src/actor.ts (Actor type user|agent|system, userActor/agentActor/systemActor, ForbiddenError, assertCanDelete deletion policy) + services.actors.forAgent(userId, clientId) resolving the OAuth client name (fallback to the client id). Exported from @workspace/db. Deferred on purpose: the drizzle actor-columns helper moves to #13 (its first consumer), since an unused export would fail fallow. Web userActor wiring is #26, MCP agent actor is #20. Tests: actor.test.ts, services/actors.test.ts (PGlite).
