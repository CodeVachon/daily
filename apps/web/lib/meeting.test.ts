import { describe, expect, it } from "vitest"

import { calendarEvent } from "./calendar-fixtures"
import {
  answerSummary,
  chipTime,
  attendeeGroups,
  meetingDetailsView,
  meetingTone,
  nextMeetingView,
  responseLabel,
  timeRange,
  whenLabel,
} from "./meeting"

const TZ = "America/Toronto"
const at = (iso: string) => new Date(iso)
const person = (
  name: string,
  response: "accepted" | "tentative" | "needsAction" | "declined",
  over = {}
) => ({
  email: `${name.toLowerCase()}@example.com`,
  name,
  self: false,
  response,
  optional: false,
  organizer: false,
  resource: false,
  ...over,
})

describe("meeting labels", () => {
  it("tones blocks by my answer, personal blocks apart", () => {
    expect(meetingTone(calendarEvent())).toBe("accepted")
    expect(meetingTone(calendarEvent({ myResponse: null }))).toBe("accepted")
    expect(meetingTone(calendarEvent({ myResponse: "tentative" }))).toBe(
      "tentative"
    )
    expect(meetingTone(calendarEvent({ myResponse: "needsAction" }))).toBe(
      "pending"
    )
    expect(meetingTone(calendarEvent({ eventType: "focusTime" }))).toBe("block")
    expect(responseLabel("needsAction")).toBe("Not answered")
  })

  it("formats times in the viewer's zone", () => {
    const standup = calendarEvent({
      startAt: at("2026-11-12T15:00:00Z"),
      endAt: at("2026-11-12T15:15:00Z"),
    })
    expect(timeRange(standup, TZ)).toBe("10:00 – 10:15 AM")
    expect(chipTime(standup, TZ)).toBe("10:00 AM")
    expect(chipTime({ ...standup, allDay: true }, TZ)).toBe("")
    expect(whenLabel(standup, TZ)).toBe("Thu, Nov 12 · 10:00 – 10:15 AM")
    const lunch = calendarEvent({
      startAt: at("2026-11-12T16:30:00Z"),
      endAt: at("2026-11-12T17:30:00Z"),
    })
    expect(timeRange(lunch, TZ)).toBe("11:30 AM – 12:30 PM")
  })

  it("formats all-day events by their dates", () => {
    const day = calendarEvent({
      allDay: true,
      startAt: at("2026-11-12T00:00:00Z"),
      endAt: at("2026-11-13T00:00:00Z"),
    })
    expect(timeRange(day, TZ)).toBe("All day")
    expect(whenLabel(day, TZ)).toBe("Thu, Nov 12 · All day")
    expect(whenLabel({ ...day, endAt: at("2026-11-15T00:00:00Z") }, TZ)).toBe(
      "Thu, Nov 12 – Sat, Nov 14"
    )
  })

  it("says when the next meeting is, or Now while it's on", () => {
    const m = calendarEvent({
      id: "m1",
      title: "Standup",
      meetUrl: "https://meet.google.com/x",
      startAt: at("2026-11-13T03:30:00Z"), // Thu 10:30 PM in Toronto
      endAt: at("2026-11-13T04:00:00Z"),
    })
    expect(nextMeetingView(m, at("2026-11-12T18:00:00Z"), TZ)).toEqual({
      title: "Standup",
      when: "10:30 PM",
      href: "/calendar?date=2026-11-12&event=m1",
      meetUrl: "https://meet.google.com/x",
    })
    expect(nextMeetingView(m, at("2026-11-13T03:45:00Z"), TZ).when).toBe("Now")
  })
})

describe("attendees", () => {
  const meeting = calendarEvent({
    attendees: [
      person("Zed", "needsAction"),
      person("Room 4", "accepted", { resource: true }),
      person("Amy", "declined"),
      person("Boss", "accepted", { organizer: true }),
      person("Bob", "tentative"),
      person("Al", "accepted"),
    ],
  })

  it("lists the organizer first, then by answer and name; rooms apart", () => {
    const { people, rooms } = attendeeGroups(meeting)
    expect(people.map((p) => p.name)).toEqual([
      "Boss",
      "Al",
      "Bob",
      "Zed",
      "Amy",
    ])
    expect(rooms.map((r) => r.name)).toEqual(["Room 4"])
  })

  it("sums up the answers", () => {
    expect(answerSummary(meeting)).toBe(
      "2 going, 1 maybe, 1 not answered, 1 not going"
    )
    expect(answerSummary(calendarEvent())).toBe("")
  })
})

describe("meetingDetailsView", () => {
  it("prepares everything the sheet shows", () => {
    const view = meetingDetailsView(
      calendarEvent({
        myResponse: "tentative",
        meetUrl: "https://meet.google.com/abc",
        conferenceName: "Google Meet",
        conference: [
          {
            type: "video",
            uri: "https://meet.google.com/abc",
            label: null,
            pin: null,
          },
          {
            type: "phone",
            uri: "tel:+15550100",
            label: "+1 555-0100",
            pin: "123",
          },
          { type: "phone", uri: "tel:+15550199", label: null, pin: null },
        ],
        location: "HQ",
        attendees: [
          person("Me", "tentative", { self: true, optional: true }),
          person("Boss", "accepted", { organizer: true }),
          { ...person("Room 4", "accepted", { resource: true }), name: null },
        ],
        attachments: [
          {
            title: "Notes",
            url: "https://docs.google.com/d/1",
            mimeType: null,
          },
        ],
        htmlLink: "https://calendar.google.com/e",
      }),
      "Agenda"
    )
    expect(view).toEqual({
      answer: "Maybe",
      join: { url: "https://meet.google.com/abc", label: "Join Google Meet" },
      phones: [
        { href: "tel:+15550100", label: "+1 555-0100 · PIN 123" },
        { href: "tel:+15550199", label: "tel:+15550199" },
      ],
      location: "HQ",
      guestsTitle: "1 going, 1 maybe",
      people: [
        {
          key: "boss@example.com",
          name: "Boss",
          response: "accepted",
          tags: ["Organizer"],
        },
        {
          key: "me@example.com",
          name: "Me",
          response: "tentative",
          tags: ["You", "Optional"],
        },
      ],
      rooms: "room 4@example.com",
      description: "Agenda",
      attachments: [{ title: "Notes", url: "https://docs.google.com/d/1" }],
      googleUrl: "https://calendar.google.com/e",
    })
  })

  it("leaves out what a meeting doesn't have", () => {
    expect(
      meetingDetailsView(
        calendarEvent({
          myResponse: null,
          attendees: [{ ...person("x", "accepted"), name: null, email: null }],
        }),
        null
      )
    ).toMatchObject({
      answer: null,
      join: null,
      phones: [],
      guestsTitle: "1 going",
      people: [{ key: "", name: "Someone" }],
      rooms: null,
      googleUrl: null,
    })
  })
})
