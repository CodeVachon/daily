---
id: 38
title: "Settings > Integrations: enter GitHub/Jira credentials and choose repositories/projects"
state: Todo
parent: 10
labels: [web, integrations]
blockedBy: [26, 37]
created: 2026-11-10T00:35:07Z
updated: 2026-11-10T13:42:50Z
---

## Description

Connect GitHub and Jira by entering credentials, see the connected account, replace or disconnect, and pick which repositories (GitHub) and projects (Jira) are in scope. Nothing outside the selection is ever queried. Replaces the earlier OAuth plan (Chris, 2026-11-10).

## Plan

- New `packages/integrations`: provider registry (fields, help, verify, listResources) for GitHub REST (`/user`, `/user/repos`) and Jira Cloud REST v3 (`/myself`, `/project/search`, *.atlassian.net only); `ProviderError extends ValidationError`; `createIntegrations({ services, fetch })` orchestrates connect / available / select / disconnect for web and MCP. Tests with a fake fetch.
- Web: /settings/integrations tab; card per provider with a credentials form (shadcn field/input), connected account + Replace / Disconnect (alert-dialog), and a resource picker (search + checkboxes) loaded in Suspense; provider errors shown as alerts.
- MCP: list_integrations (status + selection, never secrets), list_integration_resources (available repos/projects), set_integration_resources. No connect/disconnect tools: credentials and deletion stay with the user.
- README: how to create the GitHub fine-grained token and Jira API token.

## Notes

### 2026-11-10T00:44:57Z — claude-code (agent)

Per #5 (answer 3): GitHub OAuth App scopes are requested at authorize time, not configured on the app. So the Integrations connect flow can reuse the sign-in OAuth App and request `repo` (or `public_repo`) only there, while sign-in keeps `read:user user:email`. The connect flow needs its own callback path, so register it on the app; GitHub allows a callback URL that is a sub-path of the registered one, so register the app root (`https://<host>`) or add a separate app if that doesn't work. Each environment (local tailnet, DigitalOcean) needs its own OAuth Apps because each app has one callback base URL. Atlassian, Linear and Slack apps follow the same per-environment rule. Document every provider's app settings in the README, like the sign-in app.

### 2026-11-10T00:52:04Z — claude-code (agent)

Chris (2026-11-09): GitHub/Atlassian/Linear app settings and scope decisions are deferred until this story is picked up ("cross that bridge when we come to it"). Decide then, and document each provider's app settings in the README like the sign-in app.
