import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { user } from "./auth"

/** Per-user preferences. One row per user, created on first write. */
export const userSettings = pgTable("user_settings", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** IANA zone the user is currently in (reported by their browser). */
  timezone: text().notNull().default("UTC"),
  /** When `timezone` was last set (first report, or travel to another zone). */
  timezoneChangedAt: timestamp({ withTimezone: true }),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
