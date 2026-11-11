import type { CalendarEvent } from "@workspace/db/core"
import { calendarDateIn, dayInterval } from "@workspace/db/time"
import { descriptionMarkdown } from "@workspace/integrations"
import { z } from "zod"

import { json, safely, type ToolModule } from "./types"

/** The longest range list_meetings returns at once. */
const MAX_DAYS = 31
const DAY_MS = 86_400_000

/** "2026-11-12 10:00" in the user's zone. */
function localTime(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at)
}

const person = z
  .object({ name: z.string().nullable(), email: z.string().nullable() })
  .nullable()

const meetingOutput = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string().describe("ISO 8601 instant"),
  end: z.string(),
  start_local: z.string().describe("Start in the user's current time zone"),
  all_day: z.boolean(),
  my_response: z
    .string()
    .nullable()
    .describe("accepted, tentative, declined, needsAction, or null"),
  kind: z
    .string()
    .describe("default (a meeting), focusTime, outOfOffice, workingLocation…"),
  meet_url: z.string().nullable(),
  location: z.string().nullable(),
  organizer: person,
  attendee_count: z.number(),
  recurring: z.boolean(),
})

function toMeeting(e: CalendarEvent, timezone: string) {
  return {
    id: e.id,
    title: e.title,
    start: e.startAt.toISOString(),
    end: e.endAt.toISOString(),
    start_local: e.allDay
      ? e.startAt.toISOString().slice(0, 10)
      : localTime(e.startAt, timezone),
    all_day: e.allDay,
    my_response: e.myResponse,
    kind: e.eventType,
    meet_url: e.meetUrl,
    location: e.location,
    organizer: e.organizer
      ? { name: e.organizer.name, email: e.organizer.email }
      : null,
    attendee_count: e.attendees.filter((a) => !a.resource).length,
    recurring: Boolean(e.recurringEventId),
  }
}

const meetingDetails = meetingOutput.extend({
  description: z.string().nullable().describe("Markdown"),
  attendees: z.array(
    z.object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      response: z.string(),
      organizer: z.boolean(),
      optional: z.boolean(),
      room: z.boolean(),
    })
  ),
  dial_in: z.array(
    z.object({ number: z.string(), pin: z.string().nullable() })
  ),
  attachments: z.array(z.object({ title: z.string(), url: z.string() })),
  google_calendar_url: z.string().nullable(),
  task_number: z
    .number()
    .nullable()
    .describe("The task Daily keeps for this meeting (accepted meetings)"),
})

function toDetails(
  e: CalendarEvent,
  timezone: string,
  taskNumber: number | null
) {
  return {
    ...toMeeting(e, timezone),
    description: descriptionMarkdown(e.description),
    attendees: e.attendees.map((a) => ({
      name: a.name,
      email: a.email,
      response: a.response,
      organizer: a.organizer,
      optional: a.optional,
      room: a.resource,
    })),
    dial_in: e.conference
      .filter((c) => c.type === "phone")
      .map((c) => ({ number: c.label ?? c.uri, pin: c.pin })),
    attachments: e.attachments.map(({ title, url }) => ({ title, url })),
    google_calendar_url: e.htmlLink,
    task_number: taskNumber,
  }
}

/** All-day events are stored at UTC midnight: compare them by date. */
function onDates(e: CalendarEvent, from: string, to: string): boolean {
  if (!e.allDay) return true
  const first = e.startAt.toISOString().slice(0, 10)
  const afterLast = e.endAt.toISOString().slice(0, 10)
  return first <= to && afterLast > from
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")

/** The user's Google Calendar meetings, as synced into Daily (read-only). */
export const meetingTools: ToolModule = (server, ctx) => {
  const { calendar } = ctx.services

  server.registerTool(
    "list_meetings",
    {
      title: "List meetings",
      description:
        "The user's meetings from their selected Google calendars (kept in sync by Daily), between two dates in the user's time zone, earliest first. Defaults to today through the next 6 days. Declined meetings are left out unless include_declined. Synced from 30 days ago to a month ahead. Use get_meeting for attendees, agenda and dial-in.",
      inputSchema: z.object({
        from: date.optional().describe("First day, YYYY-MM-DD (default today)"),
        to: date
          .optional()
          .describe(
            "Last day, inclusive (default from + 6 days; at most 31 days)"
          ),
        include_declined: z.boolean().optional(),
      }),
      outputSchema: z.object({ meetings: z.array(meetingOutput) }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ from, to, include_declined }) =>
      safely(async () => {
        const first = from ?? calendarDateIn(new Date(), ctx.timezone)
        const start = dayInterval(first, ctx.timezone).start
        const end = to
          ? dayInterval(to, ctx.timezone).end
          : new Date(start.getTime() + 7 * DAY_MS)
        if (end.getTime() - start.getTime() > (MAX_DAYS + 1) * DAY_MS)
          throw new RangeError(`Ask for at most ${MAX_DAYS} days at a time`)
        const last = calendarDateIn(new Date(end.getTime() - 1), ctx.timezone)
        const events = await calendar.list(ctx.userId, { start, end })
        return json({
          meetings: events
            .filter((e) => include_declined || e.myResponse !== "declined")
            .filter((e) => onDates(e, first, last))
            .map((e) => toMeeting(e, ctx.timezone)),
        })
      })
  )

  server.registerTool(
    "get_meeting",
    {
      title: "Get meeting",
      description:
        'Everything about one meeting (id from list_meetings or next_meeting): attendees and their answers, the agenda (Markdown), Meet link, phone dial-in with PIN, attachments such as Meet notes, and task_number: the task Daily keeps for meetings you accepted (label "meeting", Done automatically once it\'s over).',
      inputSchema: z.object({ id: z.string().min(1) }),
      outputSchema: z.object({ meeting: meetingDetails }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) =>
      safely(async () => {
        const event = await calendar.get(ctx.userId, id)
        const task = await ctx.services.meetingTasks.taskFor(ctx.userId, event)
        return json({
          meeting: toDetails(event, ctx.timezone, task),
        })
      })
  )

  server.registerTool(
    "list_invitations",
    {
      title: "List invitations",
      description:
        "Upcoming meetings the user hasn't answered yet, soonest first: one entry per recurring series (its next occurrence, with how many are open). Read-only: only the user can accept or decline, in Daily or Google Calendar.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        invitations: z.array(
          meetingOutput.extend({
            open_occurrences: z
              .number()
              .describe("Unanswered upcoming occurrences (1 unless recurring)"),
          })
        ),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const invitations = await calendar.invitations(ctx.userId)
      return json({
        invitations: invitations.map(({ event, occurrences }) => ({
          ...toMeeting(event, ctx.timezone),
          open_occurrences: occurrences,
        })),
      })
    }
  )

  server.registerTool(
    "next_meeting",
    {
      title: "Next meeting",
      description:
        "The meeting the user is in now, or their next one within 24 hours (declined meetings, focus time and out-of-office are skipped). null when there's none.",
      inputSchema: z.object({}),
      outputSchema: z.object({ meeting: meetingOutput.nullable() }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const next = await calendar.next(ctx.userId)
      return json({ meeting: next && toMeeting(next, ctx.timezone) })
    }
  )
}
