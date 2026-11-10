import type { Priority } from "@workspace/db/core"
import { calendarDateIn, type Due } from "@workspace/db/time"

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "none", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

/** A due date as the form edits it: a calendar date plus an optional time. */
export interface DueForm {
  /** `YYYY-MM-DD`, or "" for no due date. */
  date: string
  /** `HH:mm` in the user's current zone, or "" for a floating (all-day) date. */
  time: string
}

export const EMPTY_DUE: DueForm = { date: "", time: "" }

/** Pre-fill the form from a stored due date, shown in the user's zone. */
export function dueToForm(due: Due | null, timezone: string): DueForm {
  if (!due) return EMPTY_DUE
  if (due.kind === "date") return { date: due.date, time: "" }
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(due.at)
  return { date: calendarDateIn(due.at, timezone), time }
}

/**
 * The string the server parses (see parseDue): "2026-11-14" for an all-day
 * date, "2026-11-14T17:00" for a time in the user's zone, or null to clear.
 */
export function dueFromForm({ date, time }: DueForm): string | null {
  if (!date) return null
  return time ? `${date}T${time}` : date
}

export const taskHref = (number: number) => `/tasks/${number}`

const pad = (n: number) => String(n).padStart(2, "0")

/** A date picked in the calendar (local midnight) as `YYYY-MM-DD`. */
export function toCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `YYYY-MM-DD` as a local-midnight Date for the calendar. */
export function fromCalendarDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : undefined
}

/** Short label for the due picker button: "Fri, Nov 14" or "Fri, Nov 14 · 17:00". */
export function dueFormLabel({ date, time }: DueForm): string | null {
  const day = fromCalendarDate(date)
  if (!day) return null
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(day)
  return time ? `${label} · ${time}` : label
}
