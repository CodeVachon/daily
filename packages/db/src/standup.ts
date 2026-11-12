// The standup (motte #44). Database-free: which section a task belongs in,
// where "since the last standup" starts, and the text in Markdown.
import type { StatusCategory } from "./task-inputs"
import {
  calendarDateIn,
  dayInterval,
  dueDeadline,
  formatDue,
  isDueToday,
  isOverdue,
  type CalendarDate,
  type Due,
} from "./time"

export const STANDUP_SECTIONS = [
  "done",
  "inProgress",
  "blocked",
  "upNext",
] as const
export type StandupSection = (typeof STANDUP_SECTIONS)[number]

const TITLES: Record<StandupSection, string> = {
  done: "Done",
  inProgress: "In progress",
  blocked: "Blocked",
  upNext: "Up next",
}

export interface StandupLink {
  key: string
  url: string
  /** The remote state ("merged", "In Review"); null until synced. */
  state: string | null
}

export interface StandupItem {
  number: number
  title: string
  due: Due | null
  links: StandupLink[]
  /** Open tasks this one waits on. */
  blockedBy: { number: number; title: string }[]
}

export type StandupSections = Record<StandupSection, StandupItem[]>

/** What `standupSection` needs to know about a task. */
export interface StandupCandidate {
  statusKey: string
  category: StatusCategory
  completedAt: Date | null
  due: Due | null
  openBlockers: number
}

export interface StandupWindow {
  since: Date
  now: Date
  timezone: string
}

const isWeekend = (day: number) => day === 0 || day === 6

function weekday(date: CalendarDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The nearest working day (Mon–Fri) before or after `date`. */
function workdayFrom(date: CalendarDate, step: 1 | -1): CalendarDate {
  let day = addDays(date, step)
  while (isWeekend(weekday(day))) day = addDays(day, step)
  return day
}

/**
 * Where a standup starts when none is given: the last one I posted, or
 * else the start of the previous working day (Friday, on a Monday).
 */
export function defaultSince(
  now: Date,
  timezone: string,
  lastPostedAt: Date | null
): Date {
  if (lastPostedAt) return lastPostedAt
  const today = calendarDateIn(now, timezone)
  return dayInterval(workdayFrom(today, -1), timezone).start
}

/** "Up next" looks ahead to the end of the next working day. */
export function upNextUntil(now: Date, timezone: string): Date {
  const today = calendarDateIn(now, timezone)
  return dayInterval(workdayFrom(today, 1), timezone).end
}

/**
 * Which section a task belongs in, or null:
 * - Done: finished within the window;
 * - Blocked: in Blocked, or waiting on an open task;
 * - In progress: started (active);
 * - Up next: not started, due by the end of the next working day (or overdue).
 */
export function standupSection(
  t: StandupCandidate,
  w: StandupWindow
): StandupSection | null {
  if (t.category === "done") {
    const at = t.completedAt
    return at && at >= w.since && at < w.now ? "done" : null
  }
  if (t.category === "cancelled") return null
  if (t.statusKey === "blocked" || t.openBlockers > 0) return "blocked"
  if (t.category === "active") return "inProgress"
  const due = t.due && dueDeadline(t.due, w.timezone)
  return due && due <= upNextUntil(w.now, w.timezone) ? "upNext" : null
}

/** "due today", "overdue (Tue, Nov 10)" or "due Fri, Nov 13". */
export function dueNote(item: StandupItem, w: StandupWindow): string | null {
  if (!item.due) return null
  const when = formatDue(item.due, w.timezone)
  if (isOverdue(item.due, w.now, w.timezone)) return `overdue (${when})`
  const today =
    item.due.kind === "date" && isDueToday(item.due, w.now, w.timezone)
  return today ? "due today" : `due ${when}`
}

function itemLine(
  item: StandupItem,
  section: StandupSection,
  w: StandupWindow
): string {
  const links = item.links.map(
    (l) => `[${l.key}](${l.url})` + (l.state ? ` ${l.state}` : "")
  )
  const waiting = item.blockedBy.map((b) => `#${b.number} ${b.title}`)
  const notes = [
    section === "upNext" ? dueNote(item, w) : null,
    links.length ? links.join(", ") : null,
    waiting.length ? `waiting on ${waiting.join(", ")}` : null,
  ].filter(Boolean)
  const head = `- #${item.number} ${item.title}`
  return notes.length ? `${head} · ${notes.join(" · ")}` : head
}

/**
 * The standup as Markdown; empty sections are left out. (Slack text comes
 * from the user's template; see standup-template.ts.)
 */
export function formatStandup(
  sections: StandupSections,
  w: StandupWindow
): string {
  const date = formatDue(
    { kind: "date", date: calendarDateIn(w.now, w.timezone) },
    w.timezone
  )
  const blocks = STANDUP_SECTIONS.filter((key) => sections[key].length).map(
    (key) =>
      [
        `**${TITLES[key]}**`,
        ...sections[key].map((item) => itemLine(item, key, w)),
      ].join("\n")
  )
  const body = blocks.length ? blocks : ["Nothing to report."]
  return [`**Standup · ${date}**`, ...body].join("\n\n")
}
