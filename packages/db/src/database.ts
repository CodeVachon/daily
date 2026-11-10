import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

import type * as schema from "./schema"

/**
 * Any Drizzle Postgres database over our schema — the app's postgres-js pool
 * in production, an in-memory PGlite in tests. Services depend on this, never
 * on a concrete driver.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
