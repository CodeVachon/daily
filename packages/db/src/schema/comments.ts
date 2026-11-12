// Task comments with edit history (motte #16).
import { relations } from "drizzle-orm"
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import type { Actor } from "../actor"
import { taskOwned } from "./columns"

export const taskComment = pgTable(
  "task_comment",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ...taskOwned(),
    /** Markdown. */
    body: text().notNull(),
    author: jsonb().$type<Actor>().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    editedAt: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    deletedBy: jsonb().$type<Actor>(),
  },
  (t) => [index("task_comment_task_idx").on(t.taskId, t.createdAt)]
)

/** Previous bodies of an edited comment, oldest first. */
export const taskCommentRevision = pgTable(
  "task_comment_revision",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commentId: text()
      .notNull()
      .references(() => taskComment.id, { onDelete: "cascade" }),
    body: text().notNull(),
    /** When this body was replaced, and by whom. */
    replacedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    replacedBy: jsonb().$type<Actor>().notNull(),
  },
  (t) => [
    index("task_comment_revision_comment_idx").on(t.commentId, t.replacedAt),
  ]
)

export const taskCommentRelations = relations(taskComment, ({ many }) => ({
  revisions: many(taskCommentRevision),
}))

export const taskCommentRevisionRelations = relations(
  taskCommentRevision,
  ({ one }) => ({
    comment: one(taskComment, {
      fields: [taskCommentRevision.commentId],
      references: [taskComment.id],
    }),
  })
)
