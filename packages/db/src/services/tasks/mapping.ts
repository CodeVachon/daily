import type { Actor } from "../../actor"
import type { StatusCategory, Priority } from "../../task-inputs"
import type { Due } from "../../time"

export interface DueColumns {
  dueDate: string | null
  dueAt: Date | null
  dueTimezone: string | null
}

export function dueToColumns(due: Due | null): DueColumns {
  if (!due) return { dueDate: null, dueAt: null, dueTimezone: null }
  if (due.kind === "date")
    return { dueDate: due.date, dueAt: null, dueTimezone: null }
  return { dueDate: null, dueAt: due.at, dueTimezone: due.timezone }
}

function dueFromColumns(row: DueColumns): Due | null {
  if (row.dueDate) return { kind: "date", date: row.dueDate }
  if (row.dueAt && row.dueTimezone)
    return { kind: "instant", at: row.dueAt, timezone: row.dueTimezone }
  return null
}

export interface TaskStatusInfo {
  key: string
  name: string
  category: StatusCategory
  position: number
}

export interface TaskLabelInfo {
  id: string
  name: string
  color: string | null
}

export interface Progress {
  done: number
  total: number
}

export interface TaskSummary {
  id: string
  number: number
  title: string
  status: TaskStatusInfo
  priority: Priority
  due: Due | null
  project: { id: string; name: string; color: string | null } | null
  labels: TaskLabelInfo[]
  parentTaskId: string | null
  boardPosition: string
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdBy: Actor
  updatedBy: Actor
  deletedAt: Date | null
  /** Blocking tasks that aren't done or cancelled yet. */
  openBlockers: number
  /** Checklist items, and subtasks (cancelled ones don't count). */
  progress: { checklist: Progress; subtasks: Progress }
}

export interface TaskDetail extends TaskSummary {
  description: string
  subtasks: {
    id: string
    number: number
    title: string
    status: TaskStatusInfo
  }[]
}

/** Shape returned by the relational query used to hydrate tasks. */
export interface HydratedRow extends DueColumns {
  id: string
  number: number
  title: string
  description: string
  priority: Priority
  parentTaskId: string | null
  boardPosition: string
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdBy: Actor
  updatedBy: Actor
  deletedAt: Date | null
  status: TaskStatusInfo
  project: {
    id: string
    name: string
    color: string | null
    deletedAt: Date | null
  } | null
  labels: { label: TaskLabelInfo & { deletedAt: Date | null } }[]
  checklistItems: { done: boolean; deletedAt: Date | null }[]
  subtasks: { deletedAt?: Date | null; status: { category: StatusCategory } }[]
  blockers: {
    blockedByTask: {
      deletedAt: Date | null
      status: { category: StatusCategory }
    }
  }[]
}

const isOpen = (category: StatusCategory) =>
  category === "open" || category === "active"

function progressOf(row: HydratedRow): TaskSummary["progress"] {
  const items = row.checklistItems.filter((item) => !item.deletedAt)
  const subtasks = row.subtasks.filter(
    (sub) => !sub.deletedAt && sub.status.category !== "cancelled"
  )
  return {
    checklist: {
      done: items.filter((item) => item.done).length,
      total: items.length,
    },
    subtasks: {
      done: subtasks.filter((sub) => sub.status.category === "done").length,
      total: subtasks.length,
    },
  }
}

export function toSummary(row: HydratedRow): TaskSummary {
  const project = row.project && !row.project.deletedAt ? row.project : null
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    priority: row.priority,
    due: dueFromColumns(row),
    project: project && {
      id: project.id,
      name: project.name,
      color: project.color,
    },
    labels: row.labels
      .map(({ label }) => label)
      .filter((label) => !label.deletedAt)
      .map(({ id, name, color }) => ({ id, name, color }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    parentTaskId: row.parentTaskId,
    boardPosition: row.boardPosition,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    openBlockers: row.blockers.filter(
      ({ blockedByTask }) =>
        !blockedByTask.deletedAt && isOpen(blockedByTask.status.category)
    ).length,
    progress: progressOf(row),
  }
}

/** The fields a user edits, as compared for "updated" history. */
export function editableView(
  row: DueColumns & {
    title: string
    description: string
    priority: Priority
    projectId: string | null
  }
) {
  return {
    title: row.title,
    description: row.description,
    priority: row.priority,
    due: dueFromColumns(row),
    projectId: row.projectId,
  }
}
