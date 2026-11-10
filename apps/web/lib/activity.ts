import {
  describeEvent,
  type ActorType,
  type TaskEvent,
} from "@workspace/db/core"

export interface TimelineEntry {
  id: number
  actorType: ActorType
  actorName: string
  /** "moved it from Todo to In Progress" */
  text: string
  /** "5m ago" */
  relative: string
  /** Full timestamp in the user's zone, for a tooltip. */
  exact: string
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
]

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function relativeTime(at: Date, now: Date): string {
  const seconds = Math.round((+at - +now) / 1000)
  const format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size)
      return format.format(Math.round(seconds / size), unit)
  }
  return "just now"
}

/** Status keys in history ("in_progress") shown with their names ("In Progress"). */
function withStatusNames(
  event: TaskEvent,
  names: Record<string, string>
): TaskEvent["payload"] {
  const { payload } = event
  if (payload.type !== "status_changed") return payload
  return {
    ...payload,
    from: names[payload.from] ?? payload.from,
    to: names[payload.to] ?? payload.to,
  }
}

export function toTimeline(
  events: TaskEvent[],
  {
    now,
    timezone,
    statusNames,
  }: { now: Date; timezone: string; statusNames: Record<string, string> }
): TimelineEntry[] {
  const exact = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  })
  return events.map((event) => ({
    id: event.seq,
    actorType: event.actor.type,
    actorName: event.actor.label,
    text: describeEvent(withStatusNames(event, statusNames)),
    relative: relativeTime(event.at, now),
    exact: exact.format(event.at),
  }))
}
