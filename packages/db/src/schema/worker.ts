// Background worker bookkeeping (motte #40).
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/** Last sign of life from each background job, for /api/health. */
export const workerHeartbeat = pgTable("worker_heartbeat", {
  /** The job ("link-sync"). */
  name: text().primaryKey(),
  beatAt: timestamp({ withTimezone: true }).notNull(),
  /** What the last run did (counts), for display. */
  details: jsonb().$type<Record<string, number>>().notNull().default({}),
})
