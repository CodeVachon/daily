// Links from tasks to GitHub / Jira items (motte #36).
import { relations } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import type { Actor } from "../actor"
import type { LinkKind, LinkStateCategory } from "../external-ref"
import type { IntegrationProvider } from "../integration-inputs"
import { taskOwned } from "./columns"
import { task } from "./tasks"

/**
 * One linked issue / PR. The remote fields are a cache the sync worker
 * fills in; they're null until the first sync.
 */
export const taskLink = pgTable(
  "task_link",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ...taskOwned(),
    provider: text().$type<IntegrationProvider>().notNull(),
    kind: text().$type<LinkKind>().notNull(),
    /** "owner/repo#12", "PROJ-42". */
    key: text().notNull(),
    url: text().notNull(),
    title: text(),
    /** The provider's own state name ("In Review", "open"). */
    state: text(),
    stateCategory: text().$type<LinkStateCategory>(),
    assignee: text(),
    remoteUpdatedAt: timestamp({ withTimezone: true }),
    lastSyncedAt: timestamp({ withTimezone: true }),
    /** Why the last sync failed; null once it succeeds. */
    syncError: text(),
    createdBy: jsonb().$type<Actor>().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("task_link_task_ref_idx").on(t.taskId, t.provider, t.key),
    index("task_link_user_provider_idx").on(t.userId, t.provider),
  ]
)

export const taskLinkRelations = relations(taskLink, ({ one }) => ({
  task: one(task, { fields: [taskLink.taskId], references: [task.id] }),
}))
