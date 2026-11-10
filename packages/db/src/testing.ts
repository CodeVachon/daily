import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { generateKeyBetween } from "fractional-indexing"
import { fileURLToPath } from "node:url"

import * as schema from "./schema"
import type { Database } from "./database"
import { createServices, type Services } from "./services"

// A fixed, throwaway key: tests never touch real credentials.
const TEST_KEY = Buffer.alloc(32, 7).toString("base64")

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))

export interface TestDatabase {
  services: Services
  /** The raw database, for exercising db internals (recorders, transactions). */
  db: Database
  /** Insert fixtures. Test-only: production code must use services. */
  seed: {
    user(
      overrides?: Partial<typeof schema.user.$inferInsert>
    ): Promise<typeof schema.user.$inferSelect>
    account(values: typeof schema.account.$inferInsert): Promise<void>
    oauthClient(values: typeof schema.oauthClient.$inferInsert): Promise<void>
    /** A bare task row (no events) for tests that need a task to point at. */
    task(
      userId: string,
      overrides?: Partial<typeof schema.task.$inferInsert>
    ): Promise<typeof schema.task.$inferSelect>
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
  let position: string | null = null
  return {
    services: createServices(db, {
      encryptionKey: () => TEST_KEY,
      listen: async (channel, onPayload) => {
        const stop = await client.listen(channel, onPayload)
        return stop
      },
    }),
    db,
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
      async task(userId, overrides = {}) {
        n += 1
        position = generateKeyBetween(position, null)
        const actor = {
          type: "user" as const,
          userId,
          clientId: null,
          label: "Test",
        }
        const [row] = await db
          .insert(schema.task)
          .values({
            userId,
            number: n,
            title: `Task ${n}`,
            statusKey: "todo",
            boardPosition: position,
            createdBy: actor,
            updatedBy: actor,
            ...overrides,
          })
          .returning()
        return row!
      },
    },
    query: async <Row>(sql: string) => (await client.query<Row>(sql)).rows,
    close: () => client.close(),
  }
}
