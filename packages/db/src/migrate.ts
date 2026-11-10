// Apply pending migrations to the app database, then close the connection.
// Production runs this as the image's one-shot `migrate` role before `web`
// starts (dev uses `bun run db:migrate`, i.e. drizzle-kit).
import { migrate } from "drizzle-orm/postgres-js/migrator"

import { closeDatabase, db } from "./client"

export async function runMigrations(migrationsFolder: string): Promise<void> {
  try {
    await migrate(db, { migrationsFolder })
  } finally {
    await closeDatabase()
  }
}
