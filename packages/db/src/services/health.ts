import { count } from "drizzle-orm"
import { bigint, integer, pgSchema, text } from "drizzle-orm/pg-core"

import journal from "../../drizzle/meta/_journal.json" with { type: "json" }
import type { Database } from "../database"

/** Drizzle's own bookkeeping table (not part of our schema or migrations). */
const appliedMigrations = pgSchema("drizzle").table("__drizzle_migrations", {
  id: integer().primaryKey(),
  hash: text().notNull(),
  createdAt: bigint("created_at", { mode: "number" }),
})

export interface HealthReport {
  ok: boolean
  database: "up" | "down"
  migrations: { applied: number; expected: number }
}

/** Liveness for the container health check and uptime monitoring. */
export function createHealthService(db: Database) {
  const expected = journal.entries.length
  return {
    /** Database reachable and every migration in this build applied. */
    async check(): Promise<HealthReport> {
      try {
        const [row] = await db
          .select({ applied: count() })
          .from(appliedMigrations)
        const applied = row?.applied ?? 0
        return {
          ok: applied >= expected,
          database: "up",
          migrations: { applied, expected },
        }
      } catch {
        return {
          ok: false,
          database: "down",
          migrations: { applied: 0, expected },
        }
      }
    },
  }
}
