import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./client"
import * as schema from "./schema"

/**
 * Better Auth's storage adapter. Better Auth reads/writes its own tables
 * (users, sessions, OAuth grants, ...) through this, so its access also stays
 * inside packages/db.
 */
export const authDatabaseAdapter = drizzleAdapter(db, {
  provider: "pg",
  schema,
})
