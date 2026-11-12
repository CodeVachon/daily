import { pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core"

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
  /** First day of the week: 0 Sunday, 1 Monday, 6 Saturday. */
  weekStartsOn: smallint().notNull().default(0),
  /** My Slack member ID (U…), for {{mention}} in Slack templates. */
  slackMemberId: text(),
  /** shadcn base colour (neutrals), theme and chart palette; see appearance.ts. */
  baseColor: text().notNull().default("mist"),
  theme: text().notNull().default("sky"),
  chartColor: text().notNull().default("pink"),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
