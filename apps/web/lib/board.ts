import type { Priority, TaskSummary } from "@workspace/db/core"
import { formatDue, isDueToday, isOverdue } from "@workspace/db/time"

interface Status {
  key: string
  name: string
  category: string
}

export interface BoardColumn<S extends Status = Status> {
  status: S
  tasks: TaskSummary[]
}

/**
 * Board columns in status order, each with its tasks (already sorted by board
 * position). Cancelled is hidden unless asked for.
 */
export function groupByStatus<S extends Status>(
  statuses: S[],
  tasks: TaskSummary[],
  { showCancelled = false } = {}
): BoardColumn<S>[] {
  return statuses
    .filter((status) => showCancelled || status.category !== "cancelled")
    .map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status.key === status.key),
    }))
}

/** A project or label as a coloured chip. */
export interface Chip {
  name: string
  color: string | null
}

/** What a board card shows; computed on the server in the user's zone. */
export interface BoardCard {
  id: string
  number: number
  title: string
  priority: Priority
  due: { label: string; overdue: boolean; today: boolean } | null
  project: Chip | null
  labels: Chip[]
  openBlockers: number
  checklist: { done: number; total: number } | null
  subtasks: { done: number; total: number } | null
}

const progress = (p: { done: number; total: number }) => (p.total ? p : null)

export function toBoardCard(
  task: TaskSummary,
  now: Date,
  timezone: string
): BoardCard {
  const finished =
    task.status.category === "done" || task.status.category === "cancelled"
  return {
    id: task.id,
    number: task.number,
    title: task.title,
    priority: task.priority,
    due: task.due && {
      label: formatDue(task.due, timezone),
      overdue: !finished && isOverdue(task.due, now, timezone),
      today: !finished && isDueToday(task.due, now, timezone),
    },
    project: task.project && {
      name: task.project.name,
      color: task.project.color,
    },
    labels: task.labels.map(({ name, color }) => ({ name, color })),
    openBlockers: task.openBlockers,
    checklist: progress(task.progress.checklist),
    subtasks: progress(task.progress.subtasks),
  }
}

/** Task ids per status column: the state the board drags around. */
export type BoardItems = Record<string, string[]>

export function boardItems(columns: BoardColumn[]): BoardItems {
  return Object.fromEntries(
    columns.map((c) => [c.status.key, c.tasks.map((t) => t.id)])
  )
}

function locate(items: BoardItems, id: string) {
  for (const [status, ids] of Object.entries(items)) {
    const index = ids.indexOf(id)
    if (index !== -1) return { status, index, ids }
  }
  return null
}

/**
 * Where a dragged task ended up, as the move to send to the server (its new
 * column and neighbours), or null if it didn't actually move.
 */
export function dropTarget(before: BoardItems, after: BoardItems, id: string) {
  const from = locate(before, id)
  const to = locate(after, id)
  if (!to || (from && from.status === to.status && from.index === to.index))
    return null
  return {
    status: to.status,
    afterTaskId: to.ids[to.index - 1] ?? null,
    beforeTaskId: to.ids[to.index + 1] ?? null,
  }
}
