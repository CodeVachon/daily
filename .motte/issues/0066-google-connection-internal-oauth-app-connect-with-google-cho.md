---
id: 66
title: "Google connection: Internal OAuth app, Connect with Google, choose calendars"
state: Done
parent: 65
assignee: claude-code
labels: [integrations, calendar, web, db]
created: 2026-11-10T18:45:24Z
updated: 2026-11-11T20:36:10Z
---

## Description

Connect Google Calendar from Settings > Integrations with OAuth (no token to paste), store tokens encrypted, refresh automatically, and pick which calendars Daily reads (primary selected by default).

## Plan

- README step-by-step for Chris: Cloud project in the useAppello org, enable Google Calendar API, consent screen **Internal**, OAuth client (Web) with redirect URIs for the tailnet URL and later the production domain.
- Scopes: calendar.events (read events + RSVP) and calendar.calendarlist.readonly.
- Evaluate first: Better Auth linkSocial (Google provider, sign-up disabled, encrypted tokens, getAccessToken refreshes) vs our own /api/integrations/google/start + callback (state + PKCE) storing the refresh token via services.integrations. Pick one, note why.
- Google card in Settings > Integrations: Connect / connected as <email> / Disconnect (user only); calendar picker reusing the resource picker (calendars as resources).
- varlock: GOOGLE_CLIENT_ID (required in prod) / GOOGLE_CLIENT_SECRET (sensitive).
- MCP: list_integrations already lists providers; Google appears there.
- Tests with fake fetch; verify live against Chris's calendar.

## Notes

### 2026-11-11T20:13:01Z — claude-code (agent)

GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET added to the root .env.schema as optional (@required=false; secret @sensitive), so the app and prod deploys boot before the Google client exists; the Google card should show "not configured" when they're empty. Worker picks them too (it will refresh Google access tokens). Decision: our own OAuth routes, not Better Auth linkSocial, so tokens are sealed in integration_connection like GitHub/Jira and Google never becomes a sign-in method. Redirect URI: ${BETTER_AUTH_URL}/api/integrations/google/callback.

### 2026-11-11T20:31:47Z — claude-code (agent)

Built: LINK_PROVIDERS (github, jira) split from INTEGRATION_PROVIDERS (+google) so links stay GitHub/Jira. packages/integrations/src/google.ts: authorize URL (PKCE S256, offline, prompt=consent), code exchange (refuses if either scope unticked or no refresh token), refresh, best-effort revoke on disconnect, calendarList (primary first; key = calendar name, externalId = calendar id). Account = primary calendar id (the email), so no openid/email scope needed. createIntegrations({ google }) adds googleAccessToken (refreshes + stores via services.integrations.updateCredentials), connectGoogle (selects primary if nothing selected before), disconnect. Web: /api/integrations/google/start + /callback; state + verifier + userId in an httpOnly cookie scoped to /api/integrations/google (10 min); result shown via ?google=connected|error&reason=. Verified against the dev server with a throwaway user: start redirects to Google with the right client/redirect/scopes; wrong state refused; real Google rejects a fake code with the code-specific message. Gotcha: the dev server kept a stale RSC compile of the integrations page after edits made by script; a real content edit fixed it. Remaining: Chris clicks Connect for the live check.
