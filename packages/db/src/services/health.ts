import { count } from "drizzle-orm"
import { bigint, integer, pgSchema, text } from "drizzle-orm/pg-core"

import journal from "../../drizzle/meta/_journal.json" with { type: "json" }
import type { Database } from "../database"
import { LINK_SYNC_JOB } from "../sync-policy"
import { createWorkerService } from "./worker"

/** Drizzle's own bookkeeping table (not part of our schema or migrations). */
const appliedMigrations = pgSchema("drizzle").table("__drizzle_migrations", {
  id: integer().primaryKey(),
  hash: text().notNull(),
  createdAt: bigint("created_at", { mode: "number" }),
})

export interface HealthReport {
  /** Database up and migrated. The worker doesn't affect this. */
  ok: boolean
  database: "up" | "down"
  migrations: { applied: number; expected: number }
  /** Informational: when the sync worker last ran (null: never/unknown). */
  worker: { lastBeatAt: string | null; stale: boolean }
}

/** Liveness for the container health check and uptime monitoring. */
export function createHealthService(db: Database) {
  const expected = journal.entries.length
  const worker = createWorkerService(db)
  return {
    /** Database reachable and every migration in this build applied. */
    async check(): Promise<HealthReport> {
      try {
        const [row] = await db
          .select({ applied: count() })
          .from(appliedMigrations)
        const applied = row?.applied ?? 0
        const sync = await worker.status(LINK_SYNC_JOB).catch(() => null)
        return {
          ok: applied >= expected,
          database: "up",
          migrations: { applied, expected },
          worker: {
            lastBeatAt: sync?.lastBeatAt?.toISOString() ?? null,
            stale: sync?.stale ?? true,
          },
        }
      } catch {
        return {
          ok: false,
          database: "down",
          migrations: { applied: 0, expected },
          worker: { lastBeatAt: null, stale: true },
        }
      }
    },
  }
}
