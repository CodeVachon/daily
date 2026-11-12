import { eq, sql } from "drizzle-orm"

import type { Database } from "../database"
import { workerHeartbeat } from "../schema"
import { WORKER_STALE_AFTER_SECONDS } from "../sync-policy"

export interface WorkerStatus {
  name: string
  lastBeatAt: Date | null
  /** No heartbeat, or none recently: the worker is down or stuck. */
  stale: boolean
  details: Record<string, number>
}

/** Background jobs: one runner at a time, and a heartbeat to watch. */
export function createWorkerService(db: Database) {
  return {
    /**
     * Run `job` only if no other process is running `name` (a Postgres
     * advisory lock held for the job's transaction). Resolves to null when
     * another instance holds it.
     */
    async exclusive<T>(name: string, job: () => Promise<T>): Promise<T | null> {
      return db.transaction(async (tx) => {
        const result: unknown = await tx.execute(
          sql`select pg_try_advisory_xact_lock(hashtext(${name})) as locked`
        )
        // postgres-js returns the rows; PGlite wraps them in { rows }.
        const rows = Array.isArray(result)
          ? result
          : (result as { rows: unknown[] }).rows
        const row = rows[0] as { locked: boolean } | undefined
        return row?.locked ? job() : null
      })
    },

    /** Record that `name` just ran. */
    async beat(name: string, details: Record<string, number>, at = new Date()) {
      await db
        .insert(workerHeartbeat)
        .values({ name, beatAt: at, details })
        .onConflictDoUpdate({
          target: workerHeartbeat.name,
          set: { beatAt: at, details },
        })
    },

    async status(name: string, now = new Date()): Promise<WorkerStatus> {
      const row = await db.query.workerHeartbeat.findFirst({
        where: eq(workerHeartbeat.name, name),
      })
      const age = row ? (now.getTime() - row.beatAt.getTime()) / 1000 : null
      return {
        name,
        lastBeatAt: row?.beatAt ?? null,
        stale: age === null || age > WORKER_STALE_AFTER_SECONDS,
        details: row?.details ?? {},
      }
    },
  }
}
