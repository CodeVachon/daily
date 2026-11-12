// Message templates I manage (motte #48), e.g. the standup posted to Slack.
// A template I haven't edited isn't stored: the built-in default applies.
import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import type { Actor } from "../actor"
import { user } from "./auth"

export const messageTemplate = pgTable(
  "message_template",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Which message: "standup". */
    key: text().notNull(),
    /** Slack mrkdwn with {{variables}} (see templates.ts). */
    body: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedBy: jsonb().$type<Actor>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })]
)
