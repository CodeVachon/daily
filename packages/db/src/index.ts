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
export type Database = typeof db

export { schema }
