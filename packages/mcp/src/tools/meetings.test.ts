import type { CalendarEventInput } from "@workspace/db/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
const HOUR = 3_600_000

const event = (
  externalId: string,
  over: Partial<CalendarEventInput> = {}
): CalendarEventInput => ({
  externalId,
  title: externalId,
  description: null,
  location: null,
  startAt: new Date("2025-11-12T15:00:00Z"),
  endAt: new Date("2025-11-12T15:30:00Z"),
  allDay: false,
  timeZone: null,
  status: "confirmed",
  eventType: "default",
  organizer: { email: "boss@example.com", name: "Boss", self: false },
  creator: null,
  attendees: [
    {
      email: "boss@example.com",
      name: "Boss",
      self: false,
      response: "accepted",
      optional: false,
      organizer: true,
      resource: false,
    },
    {
      email: "room@resource.calendar.google.com",
      name: "Room 4",
      self: false,
      response: "accepted",
      optional: false,
      organizer: false,
      resource: true,
    },
  ],
  myResponse: "accepted",
  meetUrl: "https://meet.google.com/abc",
  conferenceName: "Google Meet",
  conference: [
    {
      type: "video",
      uri: "https://meet.google.com/abc",
      label: null,
      pin: null,
    },
    { type: "phone", uri: "tel:+15550100", label: "+1 555-0100", pin: "123" },
  ],
  htmlLink: "https://calendar.google.com/event?eid=1",
  recurringEventId: "series",
  attachments: [
    { title: "Notes", url: "https://docs.google.com/d/1", mimeType: null },
  ],
  visibility: null,
  remoteUpdatedAt: null,
  ...over,
})

beforeAll(async () => {
  h = await createMcpHarness()
  const soon = Date.now() + HOUR
  await h.t.services.calendar.applySync(h.userId, "me@example.com", {
    full: true,
    upserts: [
      event("Standup", { description: "<b>Agenda</b><br>Demo" }),
      event("Skipped", {
        myResponse: "declined",
        startAt: new Date("2025-11-12T16:00:00Z"),
        endAt: new Date("2025-11-12T16:30:00Z"),
      }),
      event("Holiday", {
        allDay: true,
        startAt: new Date("2025-11-13T00:00:00Z"),
        endAt: new Date("2025-11-14T00:00:00Z"),
      }),
      event("Soon", {
        startAt: new Date(soon),
        endAt: new Date(soon + HOUR),
      }),
      event("Planning 1", {
        myResponse: "needsAction",
        recurringEventId: "planning",
        startAt: new Date(soon + 240 * HOUR),
        endAt: new Date(soon + 241 * HOUR),
      }),
      event("Planning 2", {
        myResponse: "needsAction",
        recurringEventId: "planning",
        startAt: new Date(soon + 264 * HOUR),
        endAt: new Date(soon + 265 * HOUR),
      }),
    ],
    deletes: [],
    nextSyncToken: "t",
  })
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("meeting tools", () => {
  it("lists meetings between dates in the user's zone, declined left out", async () => {
    const { meetings } = await call("list_meetings", {
      from: "2025-11-12",
      to: "2025-11-13",
    })
    expect(meetings.map((m: { title: string }) => m.title)).toEqual([
      "Standup",
      "Holiday",
    ])
    expect(meetings[0]).toMatchObject({
      start: "2025-11-12T15:00:00.000Z",
      start_local: "2025-11-12 10:00",
      my_response: "accepted",
      meet_url: "https://meet.google.com/abc",
      organizer: { name: "Boss", email: "boss@example.com" },
      attendee_count: 1,
      recurring: true,
    })
    expect(meetings[1]).toMatchObject({
      all_day: true,
      start_local: "2025-11-13",
    })
    const all = await call("list_meetings", {
      from: "2025-11-12",
      to: "2025-11-12",
      include_declined: true,
    })
    expect(all.meetings).toHaveLength(2)
  })

  it("defaults to the coming week", async () => {
    const { meetings } = await call("list_meetings")
    expect(meetings.map((m: { title: string }) => m.title)).toContain("Soon")
  })

  it("refuses huge ranges and bad dates", async () => {
    const huge = await h.callTool("list_meetings", {
      from: "2025-11-01",
      to: "2026-01-01",
    })
    expect(huge.isError).toBe(true)
    expect(huge.content[0].text).toMatch(/at most 31 days/)
    const bad = await h.callTool("list_meetings", { from: "tomorrow" })
    expect(bad.isError).toBe(true)
  })

  it("gets every detail of a meeting", async () => {
    const { meetings } = await call("list_meetings", {
      from: "2025-11-12",
      to: "2025-11-12",
    })
    const { meeting } = await call("get_meeting", { id: meetings[0].id })
    expect(meeting).toMatchObject({
      title: "Standup",
      description: "Agenda  \nDemo",
      dial_in: [{ number: "+1 555-0100", pin: "123" }],
      attachments: [{ title: "Notes", url: "https://docs.google.com/d/1" }],
      google_calendar_url: "https://calendar.google.com/event?eid=1",
      task_number: null,
    })
    expect(meeting.attendees).toContainEqual(
      expect.objectContaining({ name: "Room 4", room: true })
    )
    const missing = await h.callTool("get_meeting", { id: "nope" })
    expect(missing.isError).toBe(true)
  })

  it("lists invitations, one per series", async () => {
    const { invitations } = await call("list_invitations")
    expect(invitations).toEqual([
      expect.objectContaining({ title: "Planning 1", open_occurrences: 2 }),
    ])
  })

  it("finds the next meeting", async () => {
    const { meeting } = await call("next_meeting")
    expect(meeting.title).toBe("Soon")
  })
})
