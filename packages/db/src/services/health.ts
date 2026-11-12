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
  /** How many of this build's migrations the database has, out of how many. */
  migrations: { applied: number; expected: number }
  /** Informational: when the sync worker last ran (null: never/unknown). */
  worker: { lastBeatAt: string | null; stale: boolean }
}

/** Postgres "undefined_table": a database nothing has migrated yet. */
const UNDEFINED_TABLE = "42P01"

/** The Postgres error code, whether thrown bare or wrapped by drizzle. */
function postgresCode(error: unknown): unknown {
  const { code, cause } = (error ?? {}) as { code?: unknown; cause?: unknown }
  return code ?? (cause === undefined ? undefined : postgresCode(cause))
}

/** Liveness for the container health check and uptime monitoring. */
export function createHealthService(db: Database) {
  // drizzle records each applied migration with its journal `when`.
  const expected = journal.entries.map((entry) => entry.when)
  const workers = createWorkerService(db)

  /** When the sync worker last ran; informational, never fails the check. */
  async function worker(): Promise<HealthReport["worker"]> {
    const sync = await workers.status(LINK_SYNC_JOB).catch(() => null)
    return {
      lastBeatAt: sync?.lastBeatAt?.toISOString() ?? null,
      stale: sync?.stale ?? true,
    }
  }

  const report = async (
    database: HealthReport["database"],
    applied: number
  ): Promise<HealthReport> => ({
    ok: database === "up" && applied === expected.length,
    database,
    migrations: { applied, expected: expected.length },
    worker:
      database === "up" ? await worker() : { lastBeatAt: null, stale: true },
  })

  return {
    /**
     * Database reachable and every migration in this build applied. Matches
     * the applied set against this build's journal rather than counting rows,
     * so a database migrated by another build is not mistaken for this one's.
     */
    async check(): Promise<HealthReport> {
      try {
        const rows = await db
          .select({ createdAt: appliedMigrations.createdAt })
          .from(appliedMigrations)
        const have = new Set(rows.map((row) => row.createdAt))
        return report("up", expected.filter((when) => have.has(when)).length)
      } catch (error) {
        if (postgresCode(error) === UNDEFINED_TABLE) return report("up", 0)
        // The response only says "down"; the cause goes to the server log.
        console.error("health check: database query failed", error)
        return report("down", 0)
      }
    },
  }
}
