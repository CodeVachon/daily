// The Updates inbox view (motte #35).
import type { InboxItem } from "@workspace/db/core"

import { toTimeline, type TimelineEntry } from "./activity"

export interface UpdateView {
  taskId: string
  number: number
  title: string
  status: string
  /** Unread changes on the task. */
  unread: number
  /** The newest of them. */
  entries: TimelineEntry[]
  /** Unread changes not shown ("and 3 more"). */
  more: number
}

export function toUpdates(
  items: InboxItem[],
  context: {
    now: Date
    timezone: string
    statusNames: Record<string, string>
  }
): UpdateView[] {
  return items.map((item) => ({
    taskId: item.task.id,
    number: item.task.number,
    title: item.task.title,
    status: context.statusNames[item.task.statusKey] ?? item.task.statusKey,
    unread: item.unread,
    entries: toTimeline(item.events, context),
    more: Math.max(0, item.unread - item.events.length),
  }))
}
