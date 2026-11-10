---
id: 38
title: "Settings > Integrations: OAuth connect flows for GitHub, Atlassian and Linear"
state: Todo
parent: 10
labels: [web, integrations]
blockedBy: [26, 37]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T00:52:04Z
---

## Description

Connect, disconnect and see the status of each provider. OAuth callbacks on the tailnet HTTPS URL (the browser is on the tailnet, so redirects work).

## Plan

- Route handlers /api/integrations/{provider}/start and /callback with state + PKCE; store via services.connections.
- GitHub: separate OAuth App (or the same app with an extra scope) with `repo` (private repos) or public-only. Atlassian: OAuth 2.0 (3LO), scopes read:jira-work offline_access; resolve cloudId via accessible-resources. Linear: OAuth app, scope read.
- varlock schema: client id/secret per provider.
- Settings page from shadcn card/button/badge; shows the connected account and last error.

## Notes

### 2026-11-10T00:44:57Z — claude-code (agent)

Per #5 (answer 3): GitHub OAuth App scopes are requested at authorize time, not configured on the app. So the Integrations connect flow can reuse the sign-in OAuth App and request `repo` (or `public_repo`) only there, while sign-in keeps `read:user user:email`. The connect flow needs its own callback path, so register it on the app; GitHub allows a callback URL that is a sub-path of the registered one, so register the app root (`https://<host>`) or add a separate app if that doesn't work. Each environment (local tailnet, DigitalOcean) needs its own OAuth Apps because each app has one callback base URL. Atlassian, Linear and Slack apps follow the same per-environment rule. Document every provider's app settings in the README, like the sign-in app.

### 2026-11-10T00:52:04Z — claude-code (agent)

Chris (2026-11-09): GitHub/Atlassian/Linear app settings and scope decisions are deferred until this story is picked up ("cross that bridge when we come to it"). Decide then, and document each provider's app settings in the README like the sign-in app.
