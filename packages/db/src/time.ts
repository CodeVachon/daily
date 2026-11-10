/**
 * Time zone rules for Daily. Pure functions (no database), safe to import
 * from the browser via "@workspace/db/time".
 *
 * - Every stored timestamp is UTC (`timestamptz`); a zone only matters when
 *   turning an instant into a local day/time for display or windows.
 * - The user travels, so "today" always uses their *current* zone.
 * - A due date is either a floating calendar date ("Friday", wherever I am)
 *   or a fixed instant ("5pm ET") that remembers the zone it was set in.
 */
import { TZDate, tz } from "@date-fns/tz"
import { addDays, format, startOfWeek } from "date-fns"

/** `YYYY-MM-DD` calendar date with no zone. */
export type CalendarDate = string

export type Due =
  | { kind: "date"; date: CalendarDate }
  | { kind: "instant"; at: Date; timezone: string }

export interface Interval {
  /** Inclusive. */
  start: Date
  /** Exclusive. */
  end: Date
}

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function assertTimeZone(timezone: string): void {
  if (!isValidTimeZone(timezone))
    throw new RangeError(`Unknown time zone: ${timezone}`)
}

/** The calendar date an instant falls on in `timezone`. */
export function calendarDateIn(at: Date, timezone: string): CalendarDate {
  assertTimeZone(timezone)
  return format(at, "yyyy-MM-dd", { in: tz(timezone) })
}

/** The instants a calendar day spans in `timezone` (23–25h across DST). */
export function dayInterval(date: CalendarDate, timezone: string): Interval {
  assertTimeZone(timezone)
  if (!CALENDAR_DATE.test(date))
    throw new RangeError(`Not a calendar date: ${date}`)
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const start = new TZDate(y, m - 1, d, timezone)
  return { start: new Date(+start), end: new Date(+addDays(start, 1)) }
}

/** Today in `timezone`, as instants. */
export function todayInterval(now: Date, timezone: string): Interval {
  return dayInterval(calendarDateIn(now, timezone), timezone)
}

/** Monday-to-Monday week containing `now` in `timezone`. */
export function weekInterval(now: Date, timezone: string): Interval {
  assertTimeZone(timezone)
  const start = startOfWeek(now, { weekStartsOn: 1, in: tz(timezone) })
  return { start: new Date(+start), end: new Date(+addDays(start, 7)) }
}

/** The moment a due date stops being on time, for someone in `timezone`. */
export function dueDeadline(due: Due, timezone: string): Date {
  if (due.kind === "instant") return due.at
  return dayInterval(due.date, timezone).end
}

export function isOverdue(due: Due, now: Date, timezone: string): boolean {
  return now >= dueDeadline(due, timezone)
}

/** Due during today (in `timezone`) and not yet overdue. */
export function isDueToday(due: Due, now: Date, timezone: string): boolean {
  const today = todayInterval(now, timezone)
  const deadline = dueDeadline(due, timezone)
  return deadline > now && deadline <= today.end && deadline > today.start
}

function timeWithZone(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "shortGeneric",
  }).format(at)
}

function zoneAbbreviation(at: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortGeneric",
  }).formatToParts(at)
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timezone
}

/**
 * Human due label for a viewer in `viewerTimezone`.
 * Floating dates: "Fri, Nov 14". Instants: "Fri, Nov 14, 2:00 PM PT", plus
 * the original zone when it differs: "… 2:00 PM PT (5:00 PM ET)".
 */
export function formatDue(due: Due, viewerTimezone: string): string {
  assertTimeZone(viewerTimezone)
  if (due.kind === "date") {
    const { start } = dayInterval(due.date, "UTC")
    return format(start, "EEE, MMM d", { in: tz("UTC") })
  }
  const day = format(due.at, "EEE, MMM d", { in: tz(viewerTimezone) })
  const local = `${day}, ${timeWithZone(due.at, viewerTimezone)}`
  const sameZone =
    zoneAbbreviation(due.at, due.timezone) ===
    zoneAbbreviation(due.at, viewerTimezone)
  return sameZone ? local : `${local} (${timeWithZone(due.at, due.timezone)})`
}

/** "Pacific Time", "Eastern Time" … for notices like "Times now shown in …". */
export function timeZoneLabel(timezone: string, at = new Date()): string {
  assertTimeZone(timezone)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longGeneric",
  }).formatToParts(at)
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timezone
}
