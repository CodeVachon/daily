import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm"

import { task, taskLabel, taskStatus } from "../../schema"
import {
  STATUS_CATEGORIES,
  type ListTasksInput,
  type StatusCategory,
} from "../../task-inputs"
import { calendarDateIn, todayInterval, weekInterval } from "../../time"

type ListFilters = Required<Pick<ListTasksInput, "deleted">> &
  Omit<ListTasksInput, "deleted">

const TASK_NUMBER = /^#?(\d+)$/

function isCategory(value: string): value is StatusCategory {
  return (STATUS_CATEGORIES as readonly string[]).includes(value)
}

const notFinished = notInArray(taskStatus.category, ["done", "cancelled"])

function statusFilter(values: string[] | undefined): SQL | undefined {
  if (!values?.length) return undefined
  const categories = values.filter(isCategory)
  const keys = values.filter((value) => !isCategory(value))
  return or(
    categories.length ? inArray(taskStatus.category, categories) : undefined,
    keys.length ? inArray(task.statusKey, keys) : undefined
  )
}

/** Due-date windows, evaluated in the user's current zone (they travel). */
function dueFilter(
  window: ListTasksInput["due"],
  now: Date,
  timezone: string
): SQL | undefined {
  if (!window || window === "any") return undefined
  if (window === "none") return and(isNull(task.dueDate), isNull(task.dueAt))
  const today = calendarDateIn(now, timezone)
  if (window === "overdue") {
    return and(notFinished, or(lt(task.dueDate, today), lt(task.dueAt, now)))
  }
  if (window === "today") {
    const { end } = todayInterval(now, timezone)
    return or(
      eq(task.dueDate, today),
      and(gte(task.dueAt, now), lt(task.dueAt, end))
    )
  }
  const week = weekInterval(now, timezone)
  const weekEnd = calendarDateIn(new Date(+week.end - 1), timezone)
  return or(
    and(
      gte(task.dueDate, calendarDateIn(week.start, timezone)),
      sql`${task.dueDate} <= ${weekEnd}`
    ),
    and(gte(task.dueAt, week.start), lt(task.dueAt, week.end))
  )
}

function textFilter(text: string | undefined): SQL | undefined {
  if (!text) return undefined
  const number = TASK_NUMBER.exec(text)
  if (number) return eq(task.number, Number(number[1]))
  return or(
    sql`${task.search} @@ websearch_to_tsquery('english', ${text})`,
    sql`${task.title} ilike ${`%${text.replace(/[\\%_]/g, "\\$&")}%`}`
  )
}

function parentFilter(
  parentTaskId: string | null | undefined
): SQL | undefined {
  if (parentTaskId === undefined) return undefined
  return parentTaskId === null
    ? isNull(task.parentTaskId)
    : eq(task.parentTaskId, parentTaskId)
}

function labelFilter(labelId: string | undefined): SQL | undefined {
  if (!labelId) return undefined
  return sql`exists (select 1 from ${taskLabel} where ${taskLabel.taskId} = ${task.id} and ${taskLabel.labelId} = ${labelId})`
}

export function listConditions(
  userId: string,
  f: ListFilters,
  now: Date,
  timezone: string
) {
  return and(
    eq(task.userId, userId),
    f.deleted ? isNotNull(task.deletedAt) : isNull(task.deletedAt),
    statusFilter(f.status),
    f.projectId ? eq(task.projectId, f.projectId) : undefined,
    labelFilter(f.labelId),
    f.priority?.length ? inArray(task.priority, f.priority) : undefined,
    dueFilter(f.due, now, timezone),
    parentFilter(f.parentTaskId),
    textFilter(f.text)
  )
}

export function listOrder(orderBy: ListTasksInput["orderBy"]): SQL[] {
  if (orderBy === "updated") return [desc(task.updatedAt), desc(task.number)]
  if (orderBy === "due") {
    return [
      sql`coalesce(${task.dueAt}, ${task.dueDate}::timestamptz) asc nulls last`,
      asc(task.number),
    ]
  }
  return [asc(taskStatus.position), asc(task.boardPosition)]
}
