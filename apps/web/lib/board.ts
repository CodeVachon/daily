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
  /** Where clicking the card goes (the drawer on the board); defaults to the task page. */
  href?: string
  number: number
  title: string
  priority: Priority
  due: { label: string; overdue: boolean; today: boolean } | null
  project: Chip | null
  labels: Chip[]
  openBlockers: number
  completion: Completion | null
}

/** Checklist items and subtasks done, combined, e.g. "(2/3)". */
export interface Completion {
  done: number
  total: number
  /** "(2/3)" */
  label: string
  /** The breakdown, e.g. "1 of 2 checklist items, 1 of 1 subtask done". */
  detail: string
}

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`)

/** The combined completion summary, or null when there's nothing to count. */
export function completionSummary(
  progress: TaskSummary["progress"]
): Completion | null {
  const { checklist, subtasks } = progress
  const done = checklist.done + subtasks.done
  const total = checklist.total + subtasks.total
  if (total === 0) return null
  const parts = [
    checklist.total &&
      `${checklist.done} of ${checklist.total} ${plural(checklist.total, "checklist item")}`,
    subtasks.total &&
      `${subtasks.done} of ${subtasks.total} ${plural(subtasks.total, "subtask")}`,
  ].filter(Boolean)
  return {
    done,
    total,
    label: `(${done}/${total})`,
    detail: `${parts.join(", ")} done`,
  }
}

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
    completion: completionSummary(task.progress),
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
