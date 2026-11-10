import type { TaskSummary } from "@workspace/db/core"

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
