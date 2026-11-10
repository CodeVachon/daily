// The ONLY place a connection to the app database is created. Not exported
// from the package: everything else goes through services (see ./index.ts).
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { ENV } from "./env"
import * as schema from "./schema"

const createClient = () => postgres(ENV.DATABASE_URL, { max: 10 })

// Reuse the connection pool across Next.js dev hot reloads.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof createClient>
}

const client = globalForDb.pgClient ?? createClient()
if (ENV.APP_ENV !== "production") globalForDb.pgClient = client

export const db = drizzle({ client, schema, casing: "snake_case" })
