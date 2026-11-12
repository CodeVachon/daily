// The ONLY place a connection to the app database is created. Not exported
// from the package: everything else goes through services (see ./index.ts).
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { ENV } from "./env"
import type { Listen } from "./changes"
import * as schema from "./schema"

// Every timestamp is timestamptz; pin the session zone to UTC so nothing
// (now(), date_trunc, ::date casts) depends on the server's local zone.
const createClient = () =>
  postgres(ENV.DATABASE_URL, { max: 10, connection: { TimeZone: "UTC" } })

// Reuse the connection pool across Next.js dev hot reloads.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof createClient>
}

const client = globalForDb.pgClient ?? createClient()
if (ENV.APP_ENV !== "production") globalForDb.pgClient = client

export const db = drizzle({ client, schema, casing: "snake_case" })

/** Close the pool (one-shot scripts such as migrations). */
export const closeDatabase = () => client.end({ timeout: 5 })

// LISTEN needs a session that stays put; behind a transaction-mode pooler set
// DATABASE_DIRECT_URL to a direct connection. postgres-js keeps the listener
// on its own connection either way.
const listener = ENV.DATABASE_DIRECT_URL
  ? postgres(ENV.DATABASE_DIRECT_URL, {
      max: 1,
      connection: { TimeZone: "UTC" },
    })
  : client

/** Listen on a Postgres channel (the change feed). */
export const listen: Listen = async (channel, onPayload) => {
  const { unlisten } = await listener.listen(channel, onPayload)
  return unlisten
}
