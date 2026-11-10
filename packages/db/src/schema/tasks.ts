// Core task model (motte #13). Data access goes through services only.
import { relations, sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import type { Actor } from "../actor"
import { user } from "./auth"

/** Postgres full-text vector (read-only, generated). */
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" })

const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}

const owner = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })

/** Soft delete: only the user can set these (see assertCanDelete). */
const softDelete = {
  deletedAt: timestamp({ withTimezone: true }),
  deletedBy: jsonb().$type<Actor>(),
}

export const statusCategory = pgEnum("task_status_category", [
  "open",
  "active",
  "done",
  "cancelled",
])

/**
 * Board columns. Stored as data (seeded by migration) so new statuses can be
 * added later; agents reason about `category`, not the name.
 */
export const taskStatus = pgTable("task_status", {
  key: text().primaryKey(),
  name: text().notNull(),
  category: statusCategory().notNull(),
  position: integer().notNull(),
})

export const taskPriority = pgEnum("task_priority", [
  "none",
  "urgent",
  "high",
  "medium",
  "low",
])

export const project = pgTable(
  "project",
  {
    id: id(),
    userId: owner(),
    name: text().notNull(),
    color: text(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index().on(t.userId)]
)

export const label = pgTable(
  "label",
  {
    id: id(),
    userId: owner(),
    name: text().notNull(),
    color: text(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    // Label names are case-insensitive and unique among live labels.
    uniqueIndex("label_user_name_uidx")
      .on(t.userId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
  ]
)

export const task = pgTable(
  "task",
  {
    id: id(),
    userId: owner(),
    /** Per-user sequence ("#12") so people and agents can refer to tasks. */
    number: integer().notNull(),
    title: text().notNull(),
    description: text().notNull().default(""),
    statusKey: text()
      .notNull()
      .references(() => taskStatus.key),
    priority: taskPriority().notNull().default("none"),
    /** Floating due date: that calendar day wherever the user is. */
    dueDate: date({ mode: "string" }),
    /** Fixed due instant, with the zone it was set in (for display). */
    dueAt: timestamp({ withTimezone: true }),
    dueTimezone: text(),
    projectId: text().references(() => project.id, { onDelete: "set null" }),
    parentTaskId: text().references((): AnyPgColumn => task.id, {
      onDelete: "set null",
    }),
    /** Fractional index within the status column (lexicographic order). */
    boardPosition: text().notNull(),
    completedAt: timestamp({ withTimezone: true }),
    /** Full-text index over title (weighted A) and description (B). */
    search: tsvector().generatedAlwaysAs(
      (): ReturnType<typeof sql> =>
        sql`setweight(to_tsvector('english', coalesce(${task.title}, '')), 'A') || setweight(to_tsvector('english', coalesce(${task.description}, '')), 'B')`
    ),
    createdBy: jsonb().$type<Actor>().notNull(),
    updatedBy: jsonb().$type<Actor>().notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("task_user_number_uidx").on(t.userId, t.number),
    index("task_board_idx").on(t.userId, t.statusKey, t.boardPosition),
    index("task_due_date_idx").on(t.userId, t.dueDate),
    index("task_due_at_idx").on(t.userId, t.dueAt),
    index("task_project_idx").on(t.projectId),
    index("task_parent_idx").on(t.parentTaskId),
    index("task_search_idx").using("gin", t.search),
    check("task_due_one_kind", sql`${t.dueDate} is null or ${t.dueAt} is null`),
    check(
      "task_due_at_has_zone",
      sql`(${t.dueAt} is null) = (${t.dueTimezone} is null)`
    ),
    check(
      "task_not_own_parent",
      sql`${t.parentTaskId} is null or ${t.parentTaskId} <> ${t.id}`
    ),
  ]
)

export const taskLabel = pgTable(
  "task_label",
  {
    taskId: text()
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    labelId: text()
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] }), index().on(t.labelId)]
)

export const taskRelations = relations(task, ({ one, many }) => ({
  status: one(taskStatus, {
    fields: [task.statusKey],
    references: [taskStatus.key],
  }),
  project: one(project, { fields: [task.projectId], references: [project.id] }),
  parent: one(task, {
    fields: [task.parentTaskId],
    references: [task.id],
    relationName: "subtasks",
  }),
  subtasks: many(task, { relationName: "subtasks" }),
  labels: many(taskLabel),
}))

export const taskLabelRelations = relations(taskLabel, ({ one }) => ({
  task: one(task, { fields: [taskLabel.taskId], references: [task.id] }),
  label: one(label, { fields: [taskLabel.labelId], references: [label.id] }),
}))

export const projectRelations = relations(project, ({ many }) => ({
  tasks: many(task),
}))
export const labelRelations = relations(label, ({ many }) => ({
  tasks: many(taskLabel),
}))
