import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { fileURLToPath } from "node:url"

import * as schema from "./schema"
import { createServices, type Services } from "./services"

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))

export interface TestDatabase {
  services: Services
  /** Insert fixtures. Test-only: production code must use services. */
  seed: {
    user(
      overrides?: Partial<typeof schema.user.$inferInsert>
    ): Promise<typeof schema.user.$inferSelect>
    account(values: typeof schema.account.$inferInsert): Promise<void>
    oauthClient(values: typeof schema.oauthClient.$inferInsert): Promise<void>
  }
  /** Raw SQL for schema-level assertions (information_schema etc.). */
  query<Row>(sql: string): Promise<Row[]>
  close(): Promise<void>
}

/**
 * Fresh in-memory Postgres (PGlite) with every migration applied, plus the
 * real services bound to it. One per test file: `beforeAll(createTestDatabase)`.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite()
  await client.exec("SET TIME ZONE 'UTC'")
  const db = drizzle({ client, schema, casing: "snake_case" })
  await migrate(db, { migrationsFolder })
  let n = 0
  return {
    services: createServices(db),
    seed: {
      async user(overrides = {}) {
        n += 1
        const [row] = await db
          .insert(schema.user)
          .values({
            id: `user-${n}`,
            name: `User ${n}`,
            email: `user${n}@example.test`,
            ...overrides,
          })
          .returning()
        return row!
      },
      async account(values) {
        await db.insert(schema.account).values(values)
      },
      async oauthClient(values) {
        await db.insert(schema.oauthClient).values(values)
      },
    },
    query: async <Row>(sql: string) => (await client.query<Row>(sql)).rows,
    close: () => client.close(),
  }
}
