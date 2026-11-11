import { describe, expect, it } from "vitest"

import {
  isGoing,
  meetingTaskAction,
  meetingTaskDescription,
  type MeetingLink,
} from "./meeting-tasks"
import type { CalendarEvent } from "./services/calendar"

const now = new Date("2026-11-11T12:00:00Z")
const HOUR = 3_600_000
const me = {
  email: "me@example.com",
  name: null,
  self: true,
  response: "accepted" as const,
  optional: false,
  organizer: false,
  resource: false,
}
const boss = { ...me, email: "boss@example.com", self: false, organizer: true }

const meeting = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "e1",
  calendarId: "me@example.com",
  externalId: "x1",
  title: "Standup",
  description: null,
  location: null,
  startAt: new Date(now.getTime() + 2 * HOUR),
  endAt: new Date(now.getTime() + 3 * HOUR),
  allDay: false,
  timeZone: "America/Toronto",
  status: "confirmed",
  eventType: "default",
  organizer: { email: "boss@example.com", name: null, self: false },
  creator: null,
  attendees: [boss, me],
  myResponse: "accepted",
  meetUrl: "https://meet.google.com/abc",
  conferenceName: "Google Meet",
  conference: [],
  htmlLink: "https://calendar.google.com/e",
  recurringEventId: null,
  attachments: [],
  visibility: null,
  remoteUpdatedAt: null,
  ...over,
})

const link = (over: Partial<MeetingLink> = {}): MeetingLink => ({
  title: "Standup",
  startAt: meeting().startAt,
  autoCompletedAt: null,
  ...over,
})

describe("isGoing", () => {
  it("is an accepted or organized meeting with people or a Meet link", () => {
    expect(isGoing(meeting())).toBe(true)
    expect(
      isGoing(
        meeting({
          myResponse: null,
          organizer: { email: "me@example.com", name: null, self: true },
        })
      )
    ).toBe(true)
    expect(isGoing(meeting({ attendees: [] }))).toBe(true) // Meet link
  })

  it.each([
    ["tentative", { myResponse: "tentative" as const }],
    ["unanswered", { myResponse: "needsAction" as const }],
    ["declined", { myResponse: "declined" as const }],
    ["focus time", { eventType: "focusTime" as const }],
    ["all day", { allDay: true }],
    ["alone, no Meet", { attendees: [me], meetUrl: null }],
  ])("isn't for %s", (_, over) => {
    expect(isGoing(meeting(over))).toBe(false)
  })
})

describe("meetingTaskAction", () => {
  const act = (
    event: CalendarEvent | null,
    l: MeetingLink | null,
    task: Parameters<typeof meetingTaskAction>[0]["task"] = "open",
    at = now
  ) => meetingTaskAction({ event, link: l, task, now: at })

  it("creates a task for a meeting I'm going to within two weeks", () => {
    expect(act(meeting(), null)).toEqual({ kind: "create" })
    expect(act(meeting({ myResponse: "tentative" }), null).kind).toBe("none")
    const later = new Date(now.getTime() + 15 * 24 * HOUR)
    expect(act(meeting({ startAt: later, endAt: later }), null).kind).toBe(
      "none"
    )
    const over = new Date(now.getTime() - HOUR)
    expect(act(meeting({ endAt: over }), null).kind).toBe("none")
    expect(act(null, null).kind).toBe("none")
  })

  it("leaves finished or deleted tasks alone", () => {
    const moved = meeting({ title: "Renamed" })
    expect(act(moved, link(), "done").kind).toBe("none")
    expect(act(moved, link(), null).kind).toBe("none")
  })

  it("cancels when declined or gone, and reopens when accepted again", () => {
    expect(act(meeting({ myResponse: "declined" }), link())).toEqual({
      kind: "change",
      status: "cancelled",
      details: false,
    })
    expect(act(null, link(), "active")).toMatchObject({ status: "cancelled" })
    expect(act(null, link(), "cancelled").kind).toBe("none")
    expect(act(meeting(), link(), "cancelled")).toEqual({
      kind: "change",
      status: "todo",
      details: false,
    })
  })

  it("moves an ended meeting to Done once", () => {
    const ended = new Date(now.getTime() + 4 * HOUR)
    expect(act(meeting(), link(), "open", ended)).toMatchObject({
      status: "done",
    })
    expect(
      act(meeting(), link({ autoCompletedAt: ended }), "open", ended).kind
    ).toBe("none")
  })

  it("follows a new title or time", () => {
    const moved = meeting({ startAt: new Date(now.getTime() + 5 * HOUR) })
    expect(act(moved, link())).toEqual({
      kind: "change",
      status: null,
      details: true,
    })
    expect(act(meeting({ title: "Retro" }), link(), "cancelled")).toEqual({
      kind: "change",
      status: "todo",
      details: true,
    })
    expect(act(meeting(), link()).kind).toBe("none")
  })
})

describe("meetingTaskDescription", () => {
  it("says how to join and where it came from", () => {
    expect(meetingTaskDescription(meeting({ location: "Room 4" }))).toBe(
      "Join: https://meet.google.com/abc\n\nWhere: Room 4\n\n[Open in Google Calendar](https://calendar.google.com/e)\n\n_Kept in sync with your calendar by Daily._"
    )
    expect(
      meetingTaskDescription(meeting({ meetUrl: null, htmlLink: null }))
    ).toBe("_Kept in sync with your calendar by Daily._")
  })
})
