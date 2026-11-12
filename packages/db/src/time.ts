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

/** Days a week can start on: Sunday, Monday or Saturday (0 = Sunday). */
export const WEEK_STARTS = [0, 1, 6] as const
export type WeekStart = (typeof WEEK_STARTS)[number]
/** Weeks start on Sunday unless the user picks another day. */
export const DEFAULT_WEEK_START: WeekStart = 0

export function isWeekStart(value: unknown): value is WeekStart {
  return (WEEK_STARTS as readonly unknown[]).includes(value)
}

const WEEK_START_NAMES = { 0: "Sunday", 1: "Monday", 6: "Saturday" } as const

/** "Sunday" */
export function weekStartName(day: WeekStart): string {
  return WEEK_START_NAMES[day]
}

/** The day called `name` ("sunday", any case), or null. */
export function weekStartNamed(name: string): WeekStart | null {
  const day = WEEK_STARTS.find(
    (d) => WEEK_START_NAMES[d].toLowerCase() === name.toLowerCase()
  )
  return day ?? null
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

const OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i
const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/

/**
 * Parse a due date the way people and agents write it:
 * - `2026-11-14` → floating date (that day wherever I am)
 * - `2026-11-14T17:00-05:00` (or `Z`) → that exact instant
 * - `2026-11-14T17:00` (no offset) → 5pm in `timezone`
 * The instant remembers `timezone` as the zone it was set in.
 */
export function parseDue(value: string, timezone: string): Due {
  assertTimeZone(timezone)
  const text = value.trim()
  if (CALENDAR_DATE.test(text)) {
    dayInterval(text, timezone) // validates the date
    return { kind: "date", date: text }
  }
  const local = LOCAL_DATE_TIME.exec(text)
  if (local && !OFFSET.test(text)) {
    const [y, mo, d, h, mi, sec] = local
      .slice(1)
      .map((part) => Number(part ?? 0)) as number[]
    return {
      kind: "instant",
      at: new Date(+new TZDate(y!, mo! - 1, d!, h!, mi!, sec!, timezone)),
      timezone,
    }
  }
  const at = new Date(text)
  if (Number.isNaN(+at)) {
    throw new RangeError(
      `Can't read "${value}" as a date (use YYYY-MM-DD or an ISO 8601 date-time)`
    )
  }
  return { kind: "instant", at, timezone }
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
  // Reject dates that roll over (2026-02-30, 2026-13-01 …).
  if (format(start, "yyyy-MM-dd", { in: tz(timezone) }) !== date) {
    throw new RangeError(`Not a real calendar date: ${date}`)
  }
  return { start: new Date(+start), end: new Date(+addDays(start, 1)) }
}

/** Today in `timezone`, as instants. */
export function todayInterval(now: Date, timezone: string): Interval {
  return dayInterval(calendarDateIn(now, timezone), timezone)
}

/** The week containing `now` in `timezone`, starting on `weekStartsOn`. */
export function weekInterval(
  now: Date,
  timezone: string,
  weekStartsOn: WeekStart
): Interval {
  assertTimeZone(timezone)
  const start = startOfWeek(now, { weekStartsOn, in: tz(timezone) })
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
