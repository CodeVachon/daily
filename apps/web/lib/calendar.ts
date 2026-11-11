// The calendar week view (motte #72): which days, and where each event goes.
// Pure: the page passes events, the time zone and "now".
import { TZDate, tz } from "@date-fns/tz"
import type { CalendarEvent } from "@workspace/db/core"
import {
  calendarDateIn,
  dayInterval,
  weekInterval,
  type CalendarDate,
  type Interval,
} from "@workspace/db/time"
import { addDays, addMonths, format } from "date-fns"

const MINUTE = 60_000
const DAY_MINUTES = 24 * 60
/** Short events still get a clickable block. */
const MIN_BLOCK_MINUTES = 20
/** The grid always shows at least the working day. */
const DEFAULT_HOURS = { start: 8, end: 18 }

export interface WeekDay {
  date: CalendarDate
  /** "Mon" */
  weekday: string
  /** "12" */
  day: string
  isToday: boolean
  interval: Interval
}

export interface Week {
  days: WeekDay[]
  interval: Interval
  /** "Nov 9 – 15, 2026" */
  title: string
  prev: CalendarDate
  next: CalendarDate
  today: CalendarDate
  isCurrent: boolean
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** `?date=` as a calendar date, or null when missing or not a real date. */
export function parseCalendarDate(
  value: string | string[] | undefined,
  timezone: string
): CalendarDate | null {
  const text = Array.isArray(value) ? value[0] : value
  if (!text || !DATE.test(text)) return null
  try {
    dayInterval(text, timezone)
    return text
  } catch {
    return null
  }
}

function weekTitle(first: Date, last: Date, timezone: string): string {
  const f = (d: Date, pattern: string) =>
    format(d, pattern, { in: tz(timezone) })
  if (f(first, "yyyy") !== f(last, "yyyy"))
    return `${f(first, "MMM d, yyyy")} – ${f(last, "MMM d, yyyy")}`
  if (f(first, "MMM") !== f(last, "MMM"))
    return `${f(first, "MMM d")} – ${f(last, "MMM d, yyyy")}`
  return `${f(first, "MMM d")} – ${f(last, "d, yyyy")}`
}

/** The Monday-to-Sunday week containing `anchor`, in `timezone`. */
export function weekOf(
  anchor: CalendarDate,
  now: Date,
  timezone: string
): Week {
  const interval = weekInterval(dayInterval(anchor, timezone).start, timezone)
  const today = calendarDateIn(now, timezone)
  const monday = new TZDate(+interval.start, timezone)
  const days = Array.from({ length: 7 }, (_, i): WeekDay => {
    const start = addDays(monday, i)
    const date = calendarDateIn(start, timezone)
    return {
      date,
      weekday: format(start, "EEE", { in: tz(timezone) }),
      day: format(start, "d", { in: tz(timezone) }),
      isToday: date === today,
      interval: dayInterval(date, timezone),
    }
  })
  const shift = (n: number) => calendarDateIn(addDays(monday, n), timezone)
  return {
    days,
    interval,
    title: weekTitle(monday, addDays(monday, 6), timezone),
    prev: shift(-7),
    next: shift(7),
    today,
    isCurrent: days.some((d) => d.isToday),
  }
}

/** Declined meetings aren't on your calendar. */
function visibleEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => e.myResponse !== "declined")
}

/** All-day events are stored at UTC midnight; compare them as dates. */
const utcDate = (at: Date) => at.toISOString().slice(0, 10)

/** Shown in the all-day row: all-day events, and anything a day or longer. */
const isAllDayRow = (e: CalendarEvent) =>
  e.allDay || e.endAt.getTime() - e.startAt.getTime() >= DAY_MINUTES * MINUTE

function coversDay(e: CalendarEvent, day: WeekDay): boolean {
  if (e.allDay)
    return utcDate(e.startAt) <= day.date && day.date < utcDate(e.endAt)
  return e.startAt < day.interval.end && e.endAt > day.interval.start
}

export interface Block {
  event: CalendarEvent
  /** Minutes from the day's midnight. */
  start: number
  end: number
  /** Side-by-side position among overlapping events. */
  column: number
  columns: number
}

function toBlock(e: CalendarEvent, day: WeekDay): Block {
  const from = day.interval.start.getTime()
  const length = (day.interval.end.getTime() - from) / MINUTE
  const start = Math.max(0, (e.startAt.getTime() - from) / MINUTE)
  const end = Math.min(length, (e.endAt.getTime() - from) / MINUTE)
  return {
    event: e,
    start,
    end: Math.max(end, start + MIN_BLOCK_MINUTES),
    column: 0,
    columns: 1,
  }
}

/** Overlapping blocks share the width: each gets the first free column. */
function assignColumns(blocks: Block[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end)
  let cluster: Block[] = []
  let clusterEnd = -1
  const close = () => {
    const columns = Math.max(1, ...cluster.map((b) => b.column + 1))
    for (const b of cluster) b.columns = columns
    cluster = []
  }
  for (const block of sorted) {
    if (block.start >= clusterEnd) close()
    const taken = new Set(
      cluster.filter((b) => b.end > block.start).map((b) => b.column)
    )
    let column = 0
    while (taken.has(column)) column++
    block.column = column
    cluster.push(block)
    clusterEnd = Math.max(clusterEnd, block.end)
  }
  close()
  return sorted
}

export interface WeekLayout {
  /** Per day (same order as week.days). */
  allDay: CalendarEvent[][]
  timed: Block[][]
  /** Hours shown in the grid: [start, end). */
  hours: { start: number; end: number }
}

function hourRange(timed: Block[][]): WeekLayout["hours"] {
  const blocks = timed.flat()
  const first = Math.min(...blocks.map((b) => b.start))
  const last = Math.max(...blocks.map((b) => b.end))
  return {
    start: Math.max(0, Math.min(DEFAULT_HOURS.start, Math.floor(first / 60))),
    end: Math.min(24, Math.max(DEFAULT_HOURS.end, Math.ceil(last / 60))),
  }
}

/** Where every (visible) event of the week goes. */
export function layoutWeek(events: CalendarEvent[], week: Week): WeekLayout {
  const shown = visibleEvents(events)
  const allDay = week.days.map((day) =>
    shown.filter((e) => isAllDayRow(e) && coversDay(e, day))
  )
  const timed = week.days.map((day) =>
    assignColumns(
      shown
        .filter((e) => !isAllDayRow(e) && coversDay(e, day))
        .map((e) => toBlock(e, day))
    )
  )
  return { allDay, timed, hours: hourRange(timed) }
}

/** CSS position of a block inside its day column, as percentages. */
export function blockPosition(
  block: Block,
  hours: WeekLayout["hours"]
): { top: string; height: string; left: string; width: string } {
  const span = (hours.end - hours.start) * 60
  const pct = (n: number) => `${Math.round(n * 10000) / 100}%`
  const top = Math.max(0, block.start - hours.start * 60)
  const bottom = Math.min(span, block.end - hours.start * 60)
  return {
    top: pct(top / span),
    height: pct(Math.max(0, bottom - top) / span),
    left: pct(block.column / block.columns),
    width: pct(1 / block.columns),
  }
}

/** "8 AM", "12 PM" … for the grid's hour lines. */
export function hourLabels(hours: WeekLayout["hours"]): string[] {
  return Array.from({ length: hours.end - hours.start }, (_, i) => {
    const h = hours.start + i
    const suffix = h < 12 ? "AM" : "PM"
    return `${h % 12 || 12} ${suffix}`
  })
}

/** Where "now" sits in today's column (percent), or null if off the grid. */
export function nowPosition(
  week: Week,
  hours: WeekLayout["hours"],
  now: Date
): { dayIndex: number; top: string } | null {
  const dayIndex = week.days.findIndex(
    (d) => d.interval.start <= now && now < d.interval.end
  )
  if (dayIndex < 0) return null
  const minutes =
    (now.getTime() - week.days[dayIndex]!.interval.start.getTime()) / MINUTE
  const offset = minutes - hours.start * 60
  const span = (hours.end - hours.start) * 60
  if (offset < 0 || offset > span) return null
  return { dayIndex, top: `${Math.round((offset / span) * 10000) / 100}%` }
}

export type CalendarView = "week" | "month"

/** `?view=`: the month view, else the week. */
export const parseView = (
  value: string | string[] | undefined
): CalendarView =>
  (Array.isArray(value) ? value[0] : value) === "month" ? "month" : "week"

/**
 * `/calendar?date=…[&view=month][&event=…]`: the week (or month) of `date`,
 * maybe with a meeting open.
 */
export function calendarHref(
  date: CalendarDate,
  { view = "week", event }: { view?: CalendarView; event?: string } = {}
): string {
  const params = new URLSearchParams({ date })
  if (view === "month") params.set("view", view)
  if (event) params.set("event", event)
  return `/calendar?${params}`
}

/** The Week / Month switch, keeping the date. */
export function viewLinks(current: CalendarView, date: CalendarDate) {
  return (["week", "month"] as const).map((view) => ({
    view,
    label: view === "week" ? "Week" : "Month",
    href: calendarHref(date, { view }),
    active: view === current,
  }))
}

export interface MonthDay extends WeekDay {
  inMonth: boolean
}

export interface Month {
  /** Monday-start weeks covering the month. */
  weeks: MonthDay[][]
  interval: Interval
  /** "November 2026" */
  title: string
  /** First days of the neighbouring months. */
  prev: CalendarDate
  next: CalendarDate
  today: CalendarDate
  isCurrent: boolean
}

/** The month containing `anchor`, as whole weeks, in `timezone`. */
export function monthOf(
  anchor: CalendarDate,
  now: Date,
  timezone: string
): Month {
  const month = anchor.slice(0, 7)
  const first = `${month}-01`
  const weeks: MonthDay[][] = []
  let date = first
  do {
    const week = weekOf(date, now, timezone)
    weeks.push(
      week.days.map((d) => ({ ...d, inMonth: d.date.startsWith(month) }))
    )
    date = week.next
  } while (date.startsWith(month))
  const start = new TZDate(+dayInterval(first, timezone).start, timezone)
  const shift = (n: number) =>
    calendarDateIn(addMonths(start, n), timezone).slice(0, 7) + "-01"
  const today = calendarDateIn(now, timezone)
  return {
    weeks,
    interval: {
      start: weeks[0]![0]!.interval.start,
      end: weeks.at(-1)!.at(-1)!.interval.end,
    },
    title: format(start, "MMMM yyyy", { in: tz(timezone) }),
    prev: shift(-1),
    next: shift(1),
    today,
    isCurrent: today.startsWith(month),
  }
}

/** Chips shown per day before "+N more". */
const MONTH_CHIPS = 3

export interface MonthCell {
  day: MonthDay
  events: CalendarEvent[]
  more: number
}

/** Each day's (visible) events: all-day first, then by start time. */
export function layoutMonth(
  events: CalendarEvent[],
  month: Month
): MonthCell[][] {
  const shown = visibleEvents(events)
  return month.weeks.map((week) =>
    week.map((day) => {
      const all = shown
        .filter((e) => coversDay(e, day))
        .sort(
          (a, b) =>
            Number(b.allDay) - Number(a.allDay) ||
            a.startAt.getTime() - b.startAt.getTime()
        )
      return {
        day,
        events: all.slice(0, MONTH_CHIPS),
        more: Math.max(0, all.length - MONTH_CHIPS),
      }
    })
  )
}

/** The meeting id in `?event=`, if any. */
export function openEventId(
  value: string | string[] | undefined
): string | null {
  const id = Array.isArray(value) ? value[0] : value
  return id || null
}
