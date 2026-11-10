import type { TaskSummary } from "@workspace/db/core"

import { relativeTime } from "./activity"
import { toBoardCard, type Chip } from "./board"
import { PRIORITY_OPTIONS } from "./task-form"

const PRIORITY_LABEL: Record<string, string> = {
  ...Object.fromEntries(PRIORITY_OPTIONS.map((p) => [p.value, p.label])),
  none: "",
}

/** Everything a row of the Tasks table shows, computed in the user's zone. */
export function toTaskRow(task: TaskSummary, now: Date, timezone: string) {
  const card = toBoardCard(task, now, timezone)
  return {
    id: task.id,
    number: task.number,
    title: task.title,
    status: task.status.name,
    priority: PRIORITY_LABEL[task.priority] ?? "",
    due: card.due?.label ?? "",
    overdue: card.due?.overdue ?? false,
    projects: (card.project ? [card.project] : []) as Chip[],
    labels: card.labels,
    updated: relativeTime(task.updatedAt, now),
  }
}

export type TaskRowView = ReturnType<typeof toTaskRow>
