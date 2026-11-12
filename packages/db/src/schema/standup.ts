// Standups I've posted (motte #44), so the next draft starts where the last
// one ended. Slack posting (#45) records here too.
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import type { Actor } from "../actor"
import { user } from "./auth"

export const standupPost = pgTable(
  "standup_post",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    /** Where it went (a Slack channel); null when posted by hand. */
    channel: text(),
    /** What was posted (Markdown or Slack mrkdwn). */
    body: text().notNull(),
    /** Who recorded it: me, an agent, or the Slack job. */
    postedBy: jsonb().$type<Actor>().notNull(),
  },
  (t) => [index("standup_post_user_idx").on(t.userId, t.postedAt)]
)
