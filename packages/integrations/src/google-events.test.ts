import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { fakeFetch } from "./fake-fetch"
import {
  descriptionMarkdown,
  fetchCalendarChanges,
  normalizeEvent,
  type GoogleEvent,
} from "./google-events"
import { createIntegrations } from "./integrations"

const ME = "chris@example.com"
const now = new Date("2026-11-11T12:00:00Z")
const EVENTS = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(ME)}/events`

const meeting: GoogleEvent = {
  id: "m1",
  status: "confirmed",
  summary: "  Standup  ",
  description: "<b>Agenda</b>",
  location: "Room 4",
  htmlLink: "https://www.google.com/calendar/event?eid=m1",
  updated: "2026-11-10T09:00:00.000Z",
  start: { dateTime: "2026-11-12T10:00:00-05:00", timeZone: "America/Toronto" },
  end: { dateTime: "2026-11-12T10:15:00-05:00", timeZone: "America/Toronto" },
  eventType: "default",
  recurringEventId: "series",
  organizer: { email: "boss@example.com", displayName: "Boss" },
  creator: { email: "boss@example.com" },
  attendees: [
    {
      email: "boss@example.com",
      displayName: "Boss",
      organizer: true,
      responseStatus: "accepted",
    },
    { email: ME, self: true, responseStatus: "tentative", optional: true },
    { email: "room@resource.calendar.google.com", resource: true },
  ],
  hangoutLink: "https://meet.google.com/abc-defg-hij",
  conferenceData: {
    conferenceSolution: { name: "Google Meet" },
    entryPoints: [
      {
        entryPointType: "video",
        uri: "https://meet.google.com/abc-defg-hij",
        label: "meet.google.com/abc-defg-hij",
      },
      {
        entryPointType: "phone",
        uri: "tel:+1-555-0100",
        label: "+1 555-0100",
        pin: "123456789",
      },
      { entryPointType: "unknown", uri: "x" },
      { entryPointType: "more" },
    ],
  },
  attachments: [
    {
      fileUrl: "https://docs.google.com/document/d/notes",
      title: "Notes by Gemini",
      mimeType: "application/vnd.google-apps.document",
    },
    { title: "no url" },
  ],
  visibility: "private",
}

describe("normalizeEvent", () => {
  it("keeps every detail of a Meet meeting", () => {
    expect(normalizeEvent(meeting)).toEqual({
      externalId: "m1",
      title: "Standup",
      description: "<b>Agenda</b>",
      location: "Room 4",
      startAt: new Date("2026-11-12T15:00:00Z"),
      endAt: new Date("2026-11-12T15:15:00Z"),
      allDay: false,
      timeZone: "America/Toronto",
      status: "confirmed",
      eventType: "default",
      organizer: { email: "boss@example.com", name: "Boss", self: false },
      creator: { email: "boss@example.com", name: null, self: false },
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
          email: ME,
          name: null,
          self: true,
          response: "tentative",
          optional: true,
          organizer: false,
          resource: false,
        },
        {
          email: "room@resource.calendar.google.com",
          name: null,
          self: false,
          response: "needsAction",
          optional: false,
          organizer: false,
          resource: true,
        },
      ],
      myResponse: "tentative",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      conferenceName: "Google Meet",
      conference: [
        {
          type: "video",
          uri: "https://meet.google.com/abc-defg-hij",
          label: "meet.google.com/abc-defg-hij",
          pin: null,
        },
        {
          type: "phone",
          uri: "tel:+1-555-0100",
          label: "+1 555-0100",
          pin: "123456789",
        },
      ],
      htmlLink: "https://www.google.com/calendar/event?eid=m1",
      recurringEventId: "series",
      attachments: [
        {
          title: "Notes by Gemini",
          url: "https://docs.google.com/document/d/notes",
          mimeType: "application/vnd.google-apps.document",
        },
      ],
      visibility: "private",
      remoteUpdatedAt: new Date("2026-11-10T09:00:00Z"),
    })
  })

  it("handles all-day, untitled and personal events", () => {
    const allDay = normalizeEvent({
      id: "d1",
      status: "tentative",
      start: { date: "2026-11-20" },
      end: { date: "2026-11-21" },
      eventType: "outOfOffice",
      organizer: { email: ME, self: true },
    })
    expect(allDay).toMatchObject({
      title: "(No title)",
      startAt: new Date("2026-11-20T00:00:00Z"),
      endAt: new Date("2026-11-21T00:00:00Z"),
      allDay: true,
      status: "tentative",
      eventType: "outOfOffice",
      myResponse: "accepted",
      meetUrl: null,
      attendees: [],
      conference: [],
      remoteUpdatedAt: null,
    })
  })

  it("falls back for odd events", () => {
    expect(
      normalizeEvent({
        id: "x",
        start: { dateTime: "2026-11-12T10:00:00Z" },
        eventType: "somethingNew",
        attendees: [{ email: ME, self: true, responseStatus: "weird" }],
        conferenceData: {
          entryPoints: [
            { entryPointType: "video", uri: "https://zoom.us/j/1" },
          ],
        },
      })
    ).toMatchObject({
      endAt: new Date("2026-11-12T10:00:00Z"),
      eventType: "default",
      myResponse: "needsAction",
      meetUrl: "https://zoom.us/j/1",
    })
    expect(normalizeEvent({ id: "y" })).toMatchObject({
      startAt: new Date("1970-01-01T00:00:00Z"),
      myResponse: null,
      organizer: null,
    })
  })
})

describe("fetchCalendarChanges", () => {
  it("starts with everything from 30 days ago, page by page", async () => {
    const { fetch, calls } = fakeFetch({
      [`${EVENTS}?singleEvents=true&maxResults=2500&timeMin=2026-10-12T12%3A00%3A00.000Z&pageToken=p2`]:
        {
          body: {
            items: [{ id: "b", status: "cancelled" }],
            nextSyncToken: "s1",
          },
        },
      [EVENTS]: { body: { items: [meeting], nextPageToken: "p2" } },
    })
    const batch = await fetchCalendarChanges(fetch, "token", ME, null, now)
    expect(batch).toMatchObject({
      full: true,
      deletes: ["b"],
      nextSyncToken: "s1",
    })
    expect(batch.upserts.map((e) => e.externalId)).toEqual(["m1"])
    expect(calls[0]!.url).toContain("timeMin=2026-10-12T12%3A00%3A00.000Z")
    expect(calls[0]!.headers.authorization).toBe("Bearer token")
  })

  it("continues from the sync token", async () => {
    const { fetch, calls } = fakeFetch({
      [EVENTS]: { body: { items: [meeting], nextSyncToken: "s2" } },
    })
    const batch = await fetchCalendarChanges(fetch, "token", ME, "s1", now)
    expect(batch).toMatchObject({ full: false, nextSyncToken: "s2" })
    expect(calls[0]!.url).toContain("syncToken=s1")
    expect(calls[0]!.url).not.toContain("timeMin")
  })

  it("starts over when Google says the token expired (410)", async () => {
    const { fetch, calls } = fakeFetch({
      [`${EVENTS}?singleEvents=true&maxResults=2500&syncToken=old`]: {
        status: 410,
        body: { error: { message: "Sync token is no longer valid" } },
      },
      [EVENTS]: { body: { items: [], nextSyncToken: "fresh" } },
    })
    expect(
      await fetchCalendarChanges(fetch, "token", ME, "old", now)
    ).toMatchObject({ full: true, nextSyncToken: "fresh" })
    expect(calls).toHaveLength(2)
  })

  it("keeps a year ahead; anything further goes (moved or far instances)", async () => {
    const far = {
      ...meeting,
      id: "far",
      start: { dateTime: "2028-01-01T10:00:00Z" },
      end: { dateTime: "2028-01-01T11:00:00Z" },
    }
    const { fetch } = fakeFetch({
      [EVENTS]: { body: { items: [meeting, far], nextSyncToken: "s2" } },
    })
    const batch = await fetchCalendarChanges(fetch, "token", ME, "s1", now)
    expect(batch.upserts.map((e) => e.externalId)).toEqual(["m1"])
    expect(batch.deletes).toEqual(["far"])
  })

  it("passes on other errors", async () => {
    const { fetch } = fakeFetch({ [EVENTS]: { status: 500, body: {} } })
    await expect(
      fetchCalendarChanges(fetch, "token", ME, "s1", now)
    ).rejects.toThrow("Google returned 500")
  })

  it("gives up on endless pages without a sync token", async () => {
    const { fetch, calls } = fakeFetch({
      [EVENTS]: { body: { items: [meeting], nextPageToken: "more" } },
    })
    expect(
      await fetchCalendarChanges(fetch, "token", ME, null, now)
    ).toMatchObject({ nextSyncToken: null })
    expect(calls).toHaveLength(40)
  })
})

describe("syncCalendars", () => {
  let t: TestDatabase
  let userId: string
  beforeAll(async () => {
    t = await createTestDatabase()
    userId = (await t.seed.user()).id
    await t.services.integrations.connect(userId, {
      provider: "google",
      account: ME,
      credentials: {
        refreshToken: "r",
        accessToken: "a",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    })
    await t.services.integrations.setResources(userId, "google", [
      { externalId: ME, key: ME, name: ME, url: "https://calendar.google.com" },
      {
        externalId: "gone@group.calendar.google.com",
        key: "Gone",
        name: "Gone",
        url: "https://calendar.google.com",
      },
    ])
  })
  afterAll(() => t.close())

  const sync = (routes: Parameters<typeof fakeFetch>[0]) =>
    createIntegrations({
      services: t.services,
      fetch: fakeFetch(routes).fetch,
    }).syncCalendars(now)

  it("stores each selected calendar and records the ones that fail", async () => {
    expect(
      await sync({
        [EVENTS]: { body: { items: [meeting], nextSyncToken: "s1" } },
      })
    ).toEqual({ calendars: 2, changed: 1, failed: 1 })
    const status = await t.services.calendar.syncStatus(userId)
    expect(status.find((s) => s.calendarId !== ME)?.lastError).toMatch(
      /Google returned 404/
    )
  })

  it("then only asks for changes", async () => {
    const result = await sync({
      [`${EVENTS}?singleEvents=true&maxResults=2500&syncToken=s1`]: {
        body: {
          items: [{ id: "m1", status: "cancelled" }],
          nextSyncToken: "s2",
        },
      },
    })
    expect(result).toMatchObject({ changed: 1 })
    expect(
      (await t.services.calendar.syncTargets()).find((s) => s.calendarId === ME)
        ?.syncToken
    ).toBe("s2")
  })

  it("fails a calendar, not the pass, when Google isn't set up", async () => {
    await t.services.integrations.updateCredentials(userId, "google", {
      refreshToken: "r",
      accessToken: "a",
      expiresAt: "2000-01-01T00:00:00.000Z",
    })
    expect(await sync({})).toEqual({ calendars: 2, changed: 0, failed: 2 })
  })
})

describe("descriptionMarkdown", () => {
  it("keeps links and line breaks, drops other HTML", () => {
    expect(
      descriptionMarkdown(
        'Agenda:<br>1. <b>Plan</b> &amp; review<br><a href="https://docs.example.com/x">Doc</a> <a href="https://a.example.com">https://a.example.com</a><p>Done</p><script>alert(1)</script>'
      )
    ).toBe(
      "Agenda:  \n1. Plan & review  \n[Doc](https://docs.example.com/x) https://a.example.com\n\nDone"
    )
  })

  it("drops non-web links, lists and empties", () => {
    expect(
      descriptionMarkdown(
        '<ul><li>One</li><li>Two</li></ul><a href="javascript:alert(1)">x</a>'
      )
    ).toBe("- One\n\n- Two\n\nx")
    expect(descriptionMarkdown("  ")).toBeNull()
    expect(descriptionMarkdown(null)).toBeNull()
    expect(descriptionMarkdown("<br>")).toBeNull()
  })
})
