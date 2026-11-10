// Append-only task history (motte #14). Written by services in the same
// transaction as the change it describes; never updated or deleted.
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import type { TaskEventPayload } from "../events"
import { taskOwned } from "./columns"

export const actorType = pgEnum("actor_type", ["user", "agent", "system"])

/** Who made a change, as queryable columns (inbox: "changes by agents"). */
const actorColumns = {
  actorType: actorType().notNull(),
  actorUserId: text().notNull(),
  actorClientId: text(),
  actorLabel: text().notNull(),
}

export const taskEvent = pgTable(
  "task_event",
  {
    /** Monotonic cursor for "changes since" paging. */
    seq: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ...taskOwned(),
    at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    ...actorColumns,
    type: text().$type<TaskEventPayload["type"]>().notNull(),
    payload: jsonb().$type<TaskEventPayload>().notNull(),
  },
  (t) => [
    index("task_event_task_idx").on(t.taskId, t.seq),
    index("task_event_user_idx").on(t.userId, t.seq),
    index("task_event_user_actor_idx").on(t.userId, t.actorType, t.seq),
  ]
)
