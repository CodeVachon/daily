# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Storybook

Shared UI components (`packages/ui`) are documented in Storybook:

```bash
bun run storybook        # http://localhost:6006 (light/dark toolbar, docs, a11y checks)
bun run storybook:build  # static build in packages/ui/storybook-static
```

Every story is also rendered by `bun run test`. While Storybook runs, agents can query component
docs over MCP at http://localhost:6006/mcp.

## Database & auth

| Package                             | What                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `packages/db` (`@workspace/db`)     | Drizzle ORM + `postgres` driver, schema in `src/schema`, migrations in `drizzle/` |
| `packages/auth` (`@workspace/auth`) | Better Auth (GitHub only), Drizzle adapter, allowlist gate, MCP OAuth server      |
| `packages/mcp` (`@workspace/mcp`)   | MCP server (tools for Claude agents) mounted at `/api/mcp`                        |

Env is managed by [varlock](https://varlock.dev). The shared schema is the root `.env.schema`
(committed); each app/package `@import`s what it needs and generates a typed `env.ts`.
Real values go in the root `.env.local` (gitignored).

### First-time setup

1. Create the GitHub OAuth App used to sign in (see "GitHub sign-in OAuth App" below).
2. Fill in the root `.env.local`:
   ```bash
   BETTER_AUTH_SECRET=   # openssl rand -base64 32
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   AUTH_GITHUB_ALLOWED_USERS=codevachon   # default; comma-separate to allow more
   ```
3. `bun run env:check`: validates everything against the schema.
4. `bun run db:up && bun run db:migrate`: starts Postgres (docker compose) and applies migrations.
5. `bun run dev:tailnet`: turns on `tailscale serve` and starts dev; open the tailnet URL.

### GitHub sign-in OAuth App

Sign-in uses a GitHub **OAuth App** (not a GitHub App). Create one per environment, because an
OAuth App has exactly one callback URL.

1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   (https://github.com/settings/applications/new). For an organization-owned app, use the org's
   **Settings → Developer settings → OAuth Apps** instead.
2. Fill in:

   | Field                      | Value                                                                                                                                                                                         |
   | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Application name           | `Daily (local)`, or `Daily` for production. Shown on GitHub's consent screen.                                                                                                                 |
   | Homepage URL               | The app's base URL, the same as `BETTER_AUTH_URL`. Locally: your tailnet URL from `scripts/tailscale.sh url`, e.g. `https://artimis.tail756ed3.ts.net`. Production: your DigitalOcean domain. |
   | Application description    | Optional.                                                                                                                                                                                     |
   | Authorization callback URL | `<BETTER_AUTH_URL>/api/auth/callback/github`, e.g. `https://artimis.tail756ed3.ts.net/api/auth/callback/github`. Must match exactly: scheme, host, no trailing slash.                         |
   | Enable Device Flow         | Leave **off**.                                                                                                                                                                                |

3. Click **Register application**, then copy the **Client ID**, and **Generate a new client secret**
   and copy it immediately (GitHub only shows it once).
4. Put them in the root `.env.local` as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, then run
   `bun run env:check`.

Notes:

- **No scopes to configure.** OAuth App scopes are requested when the user authorizes. Sign-in
  asks only for `read:user` and `user:email` (to read your profile and verified primary email,
  including a private one).
- **Who can sign in** isn't set on GitHub: anyone can authorize the app, but only logins in
  `AUTH_GITHUB_ALLOWED_USERS` get in. Everyone else is rejected before an account is created.
- **The callback URL must match `BETTER_AUTH_URL`.** If the tailnet name changes (a new machine, or
  the MagicDNS name was renamed), update both the Homepage and callback URLs on the app.
- **Rotating the secret:** generate a new one, update `.env.local` (or the production secret), then
  delete the old one on GitHub.
- An "error: redirect_uri is not associated with this application" page from GitHub means the
  callback URL above doesn't match the URL the app is running on.

### Serving over Tailscale

The app is served at this machine's tailnet HTTPS address via `tailscale serve` (tailnet only,
not Funnel), which proxies `https://<machine>.<tailnet>.ts.net` to `http://127.0.0.1:3000`.

- `TAILSCALE_URL` is auto-detected at load time from the running Tailscale (see `.env.schema`).
- `BETTER_AUTH_URL` defaults to `TAILSCALE_URL`, or `http://localhost:3000` when Tailscale isn't
  connected. Override either in `.env.local`.
- `bun run tailnet:up` / `tailnet:down` / `tailnet:status` manage the proxy. It persists across
  reboots until you run `tailnet:down`.
- The tailnet host is added to Next's `allowedDevOrigins` automatically.

### Gated GitHub sign-in

Only GitHub logins listed in `AUTH_GITHUB_ALLOWED_USERS` can sign in. The check runs on every
OAuth callback (sign-up and sign-in), before any user, account or session row is written. Rejected
users land on `/sign-in?error=unable_to_get_user_info`. Removing someone from the list blocks their
next sign-in; existing sessions last until they expire (delete their `session` rows to cut access
immediately).

### Schema changes

Edit `packages/db/src/schema/*`, then `bun run db:generate` and `bun run db:migrate`
(`db:push` / `db:studio` are also available).

## Integrations (GitHub, Jira, Google Calendar)

Settings → Integrations connects external systems with your own credentials and lets you
choose which repositories / projects Daily may look at. Nothing outside that selection is ever
queried. Credentials are checked with the provider before saving, stored encrypted
(AES-256-GCM, key `INTEGRATIONS_ENCRYPTION_KEY`; generate one with `openssl rand -base64 32`), and
never shown again or exposed to agents. Disconnecting deletes them but keeps the selection.

- **GitHub:** a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
  with read-only **Issues**, **Pull requests** and **Metadata** on the repositories you want
  (for organisation repos, choose the organisation as the resource owner; it may need approval).
  A classic token with `repo` also works but sees every repository.
- **Jira Cloud:** your site (`acme.atlassian.net`), the email you sign in with, and an
  [Atlassian API token](https://id.atlassian.com/manage-profile/security/api-tokens). Only
  `*.atlassian.net` sites are accepted.

Changing `INTEGRATIONS_ENCRYPTION_KEY` makes stored credentials unreadable; reconnect each
integration afterwards.

### Google Calendar

Google is connected with **Connect Google Calendar** (Google's consent page) instead of pasted
credentials. Daily keeps the refresh token (encrypted like the others), refreshes access tokens
itself, and selects your primary calendar; choose others in the picker. Disconnecting also asks
Google to remove Daily's access. It needs an OAuth client, once per deployment:

1. [Create a project](https://console.cloud.google.com/projectcreate) in your Workspace
   organisation (Internal apps are only offered for projects in an organisation).
2. [Enable the Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com).
3. [Branding](https://console.cloud.google.com/auth/branding): app name "Daily", your email as
   support and developer contact; **Audience: Internal** (no Google review, tokens don't expire
   after 7 days).
4. [Data access](https://console.cloud.google.com/auth/scopes): add
   `https://www.googleapis.com/auth/calendar.events` (read events, answer invitations) and
   `https://www.googleapis.com/auth/calendar.calendarlist.readonly` (list your calendars).
5. [Create an OAuth client](https://console.cloud.google.com/auth/clients/create): **Web
   application**, authorized redirect URI `${BETTER_AUTH_URL}/api/integrations/google/callback`
   (e.g. `https://<machine>.<tailnet>.ts.net/api/integrations/google/callback`; add the
   production domain's too).
6. Put the client in `.env.local` (or the production env file) and restart:

   ```sh
   GOOGLE_CLIENT_ID=….apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   ```

Without them the Google card says it isn't set up; everything else works.

### Sync worker

Links on tasks (GitHub issues/PRs, Jira issues) fetch their title and state when added and on
**Refresh**. `apps/worker` keeps them fresh in the background: every `SYNC_POLL_SECONDS` (60) it
refreshes the links that are due: open/draft every 5 minutes, merged/done/closed every 6 hours,
failing ones every 15 minutes (`packages/db/src/sync-policy.ts`). Only repositories/projects
selected in Settings → Integrations are asked. Changes after the first sync appear in the task's
activity as "sync".

It also mirrors the selected Google calendars (`calendar-sync`, every pass): the first sync
fetches events from 30 days ago to a month ahead with every detail (attendees and their answers,
Meet link and dial-in, attachments), later passes fetch only what changed (Google sync tokens), and
a full sync every 7 days rolls that window forward. Deselecting a calendar or
disconnecting Google drops its events. Open pages refresh when events change. A calendar that
fails (e.g. you lost access) records why and is retried next pass.

- **Dev:** `bun run dev` starts it with the web app (or `bun run --cwd apps/worker dev` alone).
- **Production:** the `worker` service in `docker-compose.prod.yml` (`daily worker` in the image).
  Run one; a Postgres advisory lock stops a second copy from syncing at the same time.
- **Health:** `/api/health` includes `worker.lastBeatAt` and `worker.stale` (no pass in 5
  minutes). It doesn't change the status code, so a stopped worker never restarts the web app.

## MCP server (for Claude agents)

Every app feature also ships MCP tools (see `AGENTS.md`). The server is at
`https://<machine>.<tailnet>.ts.net/api/mcp` (Streamable HTTP, `POST` only).

What agents can do (everything is attributed to the agent in task history; agents can never delete):

| Area              | Tools                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System            | `ping`, `whoami`                                                                                                                                                          |
| Tasks             | `list_statuses`, `create_task`, `update_task`, `move_task`, `get_task`, `list_tasks`, `search_tasks`                                                                      |
| Collaboration     | `list_comments`, `add_comment`, `edit_comment`, `list_checklist`, `add_checklist_item`, `update_checklist_item`, `set_task_parent`, `list_dependencies`, `add_dependency` |
| Projects & labels | `list_projects`, `create_project`, `update_project`, `list_labels`, `create_label`, `update_label`, `set_task_labels`                                                     |
| History           | `get_activity`, `get_updates_since`, `list_unread_updates`                                                                                                                |
| Settings          | `get_appearance`, `update_appearance`                                                                                                                                     |
| Links             | `link_external`, `refresh_links`, `list_task_links`, `find_tasks_by_link` (GitHub issues/PRs, Jira issues; only the user can unlink)                                      |
| Integrations      | `list_integrations`, `list_integration_resources`, `set_integration_scope` (never credentials: connecting and disconnecting is the user's)                                |

Prompts: `capture_task`, `triage_inbox`, `next_up`. Resource: `daily://task/{number}` (a task as
Markdown). Tasks are referred to as `#12`; due dates are plain strings in the user's current time
zone (`2026-11-14`, `2026-11-14T17:00`).

**Auth.** The app is its own OAuth 2.1 authorization server (`@better-auth/mcp`). When an MCP
client connects, it opens a browser to `/sign-in` (GitHub, same allowlist) and then `/consent`.
Tokens are JWTs bound to the `/api/mcp` resource and verified against `/api/auth/jwks`. Clients
register via Client ID Metadata Documents (MCP 2026-07-28) or Dynamic Client Registration.

**Connect Claude Code:**

```bash
claude mcp add --transport http daily "$(scripts/tailscale.sh url)/api/mcp"
```

Then run `/mcp` in Claude Code and authenticate.

**Connect Codex** (Codex identifies itself with a Client ID Metadata Document, so no registration
step is needed; its changes show up as "Codex"):

```bash
codex mcp add daily --url "$(scripts/tailscale.sh url)/api/mcp"
codex mcp login daily
```

The login opens the same GitHub sign-in and Allow screen. With `--no-browser`, open the printed
URL yourself and paste the final `127.0.0.1` callback URL back into the terminal.

**Test:** `bun run mcp:smoke` with the dev server running. It runs the full OAuth flow with a
throwaway user and calls every tool.

## Production image

One Docker image runs every role; the droplet's env file supplies all settings
(see `docs/adr/0001-production-deployment.md`).

```bash
docker build -t daily --build-arg GIT_SHA=$(git rev-parse HEAD) .
docker compose -f docker-compose.prod.yml up -d   # postgres, migrate (one-shot), web, worker
```

- **Roles** (`docker/entrypoint.sh`): `web` (default, the Next.js standalone
  server), `migrate` (applies `packages/db/drizzle`, then exits) and `worker`
  (the link sync worker, `apps/worker` bundled as `worker.mjs`). All boot
  through `varlock run`, which validates the environment against `.env.schema`
  and exits with a clear message if anything is missing.
- **No values are baked in.** `.env.schema` sets `@defaultDynamic=true`, so
  nothing is inlined at build time; the build uses throwaway placeholders.
- **Production env:** `APP_ENV=production`, `BETTER_AUTH_URL` (required,
  `https://<domain>`), `DATABASE_URL` (`postgres://daily:<password>@postgres:5432/daily`),
  `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`,
  `GITHUB_CLIENT_SECRET`, `AUTH_GITHUB_ALLOWED_USERS`. Tailscale detection
  never runs outside development.
- **Health:** `GET /api/health` returns 200 when the database answers and every
  migration in the image is applied, else 503. The image's `HEALTHCHECK` uses it.
- **Local trial:** `DAILY_IMAGE=daily DAILY_ENV_FILE=./prod.env DAILY_WEB_PORT=3100
docker compose -p daily-prodtest -f docker-compose.prod.yml up -d --wait`.

### Releases

Publishing a GitHub Release builds and pushes the image
(`.github/workflows/release.yml`):

```bash
gh release create v0.1.0 --generate-notes      # tag must be vX.Y.Z (or vX.Y.Z-rc.N)
```

The workflow runs the checks, then pushes `ghcr.io/codevachon/daily` tagged
`0.1.0`, `0.1`, `latest` (stable releases only) and `sha-<short>`. The version
and commit are baked in (`APP_VERSION`, `APP_COMMIT`) and shown in
**Settings → About**; MCP clients see the version in `initialize`. To rebuild an
existing tag, run the workflow manually with that tag. Local builds report `dev`.

## Development workflow

Rules for every commit are in `AGENTS.md` ("Commit rules") and enforced by a pre-commit hook that
`bun install` sets up (`core.hooksPath=.githooks`). Run the same checks with `bun run check`:

1. no motte issue left In Progress
2. `bun run typecheck`
3. `bun run lint` (zero warnings; blocks database imports outside `packages/db`)
4. `bun run test` (Vitest across the monorepo, with coverage; DB tests use in-memory PGlite)
5. `bun run fallow` (dead code, dependencies, duplication, complexity scored against coverage)

Tooling: `motte` and `codegraph` (`npm i -g @colbymchenry/codegraph`) are global CLIs; Fallow is a
dev dependency. All three are MCP servers in `.mcp.json`.
