// Accepted meetings become tasks (motte #69). Database-free: the rules for
// what a meeting's task should do, given the meeting and the task now.
import type { CalendarEvent } from "./services/calendar"
import type { StatusCategory } from "./task-inputs"

/** Meetings this far ahead get a task. */
const MEETING_TASK_DAYS = 14
/** The label meeting tasks carry. */
export const MEETING_LABEL = "meeting"

const DAY_MS = 86_400_000

/**
 * A meeting I'm going to: a real meeting (not focus time, out of office or
 * an all-day event) with other people or a Meet link, that I accepted or
 * organize.
 */
export function isGoing(e: CalendarEvent): boolean {
  if (e.eventType !== "default" || e.allDay) return false
  const others = e.attendees.some((a) => !a.self && !a.resource)
  if (!others && !e.meetUrl) return false
  return e.myResponse === "accepted" || Boolean(e.organizer?.self)
}

/** What Daily remembers about a meeting's task. */
export interface MeetingLink {
  title: string
  startAt: Date
  /** Set once Daily moved it to Done after the meeting; never again. */
  autoCompletedAt: Date | null
}

export type MeetingTaskAction =
  | { kind: "none" }
  | { kind: "create" }
  | {
      kind: "change"
      /** New status, if any: back to Todo, Cancelled or Done. */
      status: "todo" | "cancelled" | "done" | null
      /** The meeting's new title or time, if it moved. */
      details: boolean
    }

const NONE = { kind: "none" } as const

function shouldCreate(event: CalendarEvent | null, now: Date): boolean {
  return (
    event !== null &&
    isGoing(event) &&
    event.endAt > now &&
    event.startAt.getTime() < now.getTime() + MEETING_TASK_DAYS * DAY_MS
  )
}

function nextStatus(
  event: CalendarEvent | null,
  link: MeetingLink,
  category: StatusCategory,
  now: Date
): "todo" | "cancelled" | "done" | null {
  const going = event !== null && isGoing(event)
  const open = category === "open" || category === "active"
  if (!going) return open ? "cancelled" : null
  if (category === "cancelled") return "todo"
  const ended = event.endAt <= now
  return open && ended && !link.autoCompletedAt ? "done" : null
}

/** The meeting I'm going to has a new title or time since it was applied. */
function movedSince(event: CalendarEvent | null, link: MeetingLink): boolean {
  if (event === null || !isGoing(event)) return false
  return (
    event.title !== link.title ||
    event.startAt.getTime() !== link.startAt.getTime()
  )
}

/**
 * What to do with a meeting's task:
 * - no task yet: create one for a meeting I'm going to, within two weeks;
 * - declined, cancelled or deleted: cancel the open task;
 * - accepted again: back to Todo;
 * - over: Done, once (if I reopen it, it stays open);
 * - a new title or time: update the task.
 * A task I finished or deleted is never touched. `event` is null when the
 * meeting is gone from a calendar that's still synced.
 */
export function meetingTaskAction({
  event,
  link,
  task,
  now,
}: {
  event: CalendarEvent | null
  link: MeetingLink | null
  /** The task's status category; null if the user deleted it. */
  task: StatusCategory | null
  now: Date
}): MeetingTaskAction {
  if (!link) return shouldCreate(event, now) ? { kind: "create" } : NONE
  if (task === null || task === "done") return NONE
  const status = nextStatus(event, link, task, now)
  const details = movedSince(event, link)
  return status || details ? { kind: "change", status, details } : NONE
}

/** The task's description: how to join, and where it came from. */
export function meetingTaskDescription(e: CalendarEvent): string {
  return [
    e.meetUrl && `Join: ${e.meetUrl}`,
    e.location && `Where: ${e.location}`,
    e.htmlLink && `[Open in Google Calendar](${e.htmlLink})`,
    "_Kept in sync with your calendar by Daily._",
  ]
    .filter(Boolean)
    .join("\n\n")
}
