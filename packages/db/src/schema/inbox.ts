// What the user has seen (motte #35). Positions are task_event seqs.
import {
  bigint,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { user } from "./auth"
import { taskOwned } from "./columns"

/** The last event the user had seen on a task when they last opened it. */
export const taskRead = pgTable(
  "task_read",
  {
    ...taskOwned(),
    lastReadSeq: bigint({ mode: "number" }).notNull(),
    readAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.taskId] })]
)

/** "Mark all read": everything up to this event counts as seen. */
export const inboxState = pgTable("inbox_state", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  clearedSeq: bigint({ mode: "number" }).notNull(),
  clearedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
