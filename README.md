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
import { Button } from "@workspace/ui/components/button";
```

## Database & auth

| Package | What |
| --- | --- |
| `packages/db` (`@workspace/db`) | Drizzle ORM + `postgres` driver, schema in `src/schema`, migrations in `drizzle/` |
| `packages/auth` (`@workspace/auth`) | Better Auth (GitHub only), Drizzle adapter, allowlist gate |

Env is managed by [varlock](https://varlock.dev). The shared schema is the root `.env.schema`
(committed); each app/package `@import`s what it needs and generates a typed `env.ts`.
Real values go in the root `.env.local` (gitignored).

### First-time setup

1. Create a GitHub OAuth App (https://github.com/settings/developers). Homepage and callback URL
   must use this machine's tailnet URL (run `scripts/tailscale.sh url` to print it):
   `https://<machine>.<tailnet>.ts.net/api/auth/callback/github`.
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
