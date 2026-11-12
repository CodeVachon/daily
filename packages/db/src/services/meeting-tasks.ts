import { and, eq } from "drizzle-orm"

import { systemActor } from "../actor"
import type { Database } from "../database"
import {
  MEETING_LABEL,
  meetingTaskAction,
  meetingTaskDescription,
  type MeetingLink,
} from "../meeting-tasks"
import { meetingTask } from "../schema"
import {
  CALENDAR_SYNC_FUTURE_DAYS,
  CALENDAR_SYNC_PAST_DAYS,
} from "../sync-policy"
import type { StatusCategory } from "../task-inputs"
import type { CalendarEvent, createCalendarService } from "./calendar"
import type { createLabelService } from "./labels"
import type { createSettingsService } from "./settings"
import type { createTaskService } from "./tasks"

const DAY_MS = 86_400_000
/** Links older than this are past the synced window: left alone. */
const LOOK_BACK_DAYS = CALENDAR_SYNC_PAST_DAYS - 5

/** What one pass did to meeting tasks. */
export interface MeetingTaskSummary {
  created: number
  updated: number
}

interface Deps {
  calendar: ReturnType<typeof createCalendarService>
  tasks: ReturnType<typeof createTaskService>
  labels: ReturnType<typeof createLabelService>
  settings: ReturnType<typeof createSettingsService>
}

type LinkRow = typeof meetingTask.$inferSelect

const keyOf = (calendarId: string, externalId: string) =>
  `${calendarId}\n${externalId}`

/**
 * Keeps a task for each meeting I'm going to (motte #69), as the sync
 * system: created two weeks ahead, renamed or moved with the meeting,
 * cancelled when declined or cancelled, Done once it's over.
 */
export function createMeetingTaskService(db: Database, deps: Deps) {
  /** The task's status category; null if the user deleted it. */
  async function taskCategory(
    userId: string,
    taskId: string
  ): Promise<StatusCategory | null> {
    const found = await deps.tasks.get(userId, taskId).catch(() => null)
    return found && !found.deletedAt ? found.status.category : null
  }

  async function create(userId: string, e: CalendarEvent) {
    const actor = systemActor(userId, "sync")
    const created = await deps.tasks.create(actor, {
      ...(await details(userId, e)),
      description: meetingTaskDescription(e),
      status: "todo",
    })
    const [label] = await deps.labels.ensure(actor, [MEETING_LABEL])
    await deps.labels.setForTask(actor, created.id, [label!.id])
    await db.insert(meetingTask).values({
      userId,
      calendarId: e.calendarId,
      externalId: e.externalId,
      taskId: created.id,
      title: e.title,
      startAt: e.startAt,
    })
  }

  /** The meeting's title and time, as task fields. */
  async function details(userId: string, e: CalendarEvent) {
    const timezone = e.timeZone ?? (await deps.settings.getTimezone(userId))
    return {
      title: e.title,
      due: { kind: "instant" as const, at: e.startAt, timezone },
    }
  }

  async function change(
    link: LinkRow,
    e: CalendarEvent | null,
    action: { status: string | null; details: boolean },
    now: Date
  ) {
    const moved = action.details ? e : null
    await deps.tasks.update(systemActor(link.userId, "sync"), link.taskId, {
      ...(action.status ? { status: action.status } : {}),
      ...(moved ? await details(link.userId, moved) : {}),
    })
    const remember = {
      ...(moved ? { title: moved.title, startAt: moved.startAt } : {}),
      ...(action.status === "done" ? { autoCompletedAt: now } : {}),
    }
    if (Object.keys(remember).length === 0) return
    await db
      .update(meetingTask)
      .set(remember)
      .where(
        and(
          eq(meetingTask.userId, link.userId),
          eq(meetingTask.calendarId, link.calendarId),
          eq(meetingTask.externalId, link.externalId)
        )
      )
  }

  return {
    /** The number of the live task Daily keeps for a meeting, if any. */
    async taskFor(
      userId: string,
      e: Pick<CalendarEvent, "calendarId" | "externalId">
    ): Promise<number | null> {
      const [link] = await db
        .select({ taskId: meetingTask.taskId })
        .from(meetingTask)
        .where(
          and(
            eq(meetingTask.userId, userId),
            eq(meetingTask.calendarId, e.calendarId),
            eq(meetingTask.externalId, e.externalId)
          )
        )
      if (!link) return null
      const found = await deps.tasks.get(userId, link.taskId).catch(() => null)
      return found && !found.deletedAt ? found.number : null
    },

    /** One pass for one user: create, update, cancel or finish tasks. */
    async reconcile(
      userId: string,
      now = new Date()
    ): Promise<MeetingTaskSummary> {
      const calendars = new Set(
        (await deps.calendar.syncTargets(now))
          .filter((t) => t.userId === userId)
          .map((t) => t.calendarId)
      )
      const from = new Date(now.getTime() - LOOK_BACK_DAYS * DAY_MS)
      const to = new Date(
        now.getTime() + (CALENDAR_SYNC_FUTURE_DAYS + 1) * DAY_MS
      )
      const events = new Map(
        (await deps.calendar.list(userId, { start: from, end: to }))
          .filter((e) => calendars.has(e.calendarId))
          .map((e) => [keyOf(e.calendarId, e.externalId), e])
      )
      const links = new Map(
        (
          await db
            .select()
            .from(meetingTask)
            .where(eq(meetingTask.userId, userId))
        )
          .filter((l) => calendars.has(l.calendarId) && l.startAt >= from)
          .map((l) => [keyOf(l.calendarId, l.externalId), l])
      )
      const summary: MeetingTaskSummary = { created: 0, updated: 0 }
      for (const key of new Set([...events.keys(), ...links.keys()])) {
        const event = events.get(key) ?? null
        const link = links.get(key) ?? null
        const action = meetingTaskAction({
          event,
          link: link as MeetingLink | null,
          task: link ? await taskCategory(userId, link.taskId) : null,
          now,
        })
        if (action.kind === "create") {
          await create(userId, event!)
          summary.created++
        } else if (action.kind === "change") {
          await change(link!, event, action, now)
          summary.updated++
        }
      }
      return summary
    },
  }
}
