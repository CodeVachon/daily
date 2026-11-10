// Column sets shared by tables that hang off a task.
import { text } from "drizzle-orm/pg-core"

import { user } from "./auth"
import { task } from "./tasks"

/** The task a row belongs to and its owner; both cascade on delete. */
export const taskOwned = () => ({
  taskId: text()
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})
