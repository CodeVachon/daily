import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { userActor } from "../actor"
import { NotFoundError } from "../errors"
import type { CalendarEventInput } from "../calendar-inputs"
import type { CalendarChange } from "../changes"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let userId: string
let otherId: string
beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
  otherId = (await t.seed.user()).id
})
afterAll(() => t.close())

const PRIMARY = "chris@example.com"
const TEAM = "team@group.calendar.google.com"

const event = (
  externalId: string,
  over: Partial<CalendarEventInput> = {}
): CalendarEventInput => ({
  externalId,
  title: `Event ${externalId}`,
  description: null,
  location: null,
  startAt: new Date("2026-11-12T15:00:00Z"),
  endAt: new Date("2026-11-12T15:30:00Z"),
  allDay: false,
  timeZone: "America/Toronto",
  status: "confirmed",
  eventType: "default",
  organizer: { email: PRIMARY, name: null, self: true },
  creator: null,
  attendees: [],
  myResponse: "accepted",
  meetUrl: "https://meet.google.com/abc-defg-hij",
  conferenceName: "Google Meet",
  conference: [
    {
      type: "video",
      uri: "https://meet.google.com/abc-defg-hij",
      label: "meet.google.com/abc-defg-hij",
      pin: null,
    },
  ],
  htmlLink: null,
  recurringEventId: null,
  attachments: [],
  visibility: null,
  remoteUpdatedAt: null,
  ...over,
})

const resource = (id: string, name: string) => ({
  externalId: id,
  key: name,
  name,
  url: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(id)}`,
})

async function connectGoogle(calendars: string[]) {
  await t.services.integrations.connect(userId, {
    provider: "google",
    account: PRIMARY,
    credentials: { refreshToken: "r", accessToken: "a", expiresAt: "x" },
  })
  await t.services.integrations.setResources(
    userId,
    "google",
    calendars.map((id) => resource(id, id))
  )
}

const stored = async (calendarId: string) =>
  (await t.db.query.calendarEvent.findMany({
    where: (e, { and, eq }) =>
      and(eq(e.userId, userId), eq(e.calendarId, calendarId)),
    orderBy: (e, { asc }) => asc(e.externalId),
  })) as { externalId: string; title: string; conference: unknown }[]

describe("calendar", () => {
  it("syncs nothing until Google is connected", async () => {
    await t.services.integrations.connect(otherId, {
      provider: "github",
      account: "someone",
      credentials: { token: "t" },
    })
    expect(await t.services.calendar.syncTargets()).toEqual([])
  })

  it("targets each selected calendar, starting with a full sync", async () => {
    await connectGoogle([PRIMARY, TEAM])
    expect(await t.services.calendar.syncTargets()).toEqual(
      expect.arrayContaining([
        { userId, calendarId: PRIMARY, syncToken: null },
        { userId, calendarId: TEAM, syncToken: null },
      ])
    )
  })

  it("stores a full sync with every detail and announces it", async () => {
    const heard: CalendarChange[] = []
    const off = await t.services.calendarChanges.subscribe(userId, (c) =>
      heard.push(c)
    )
    const changed = await t.services.calendar.applySync(userId, PRIMARY, {
      full: true,
      upserts: [event("a"), event("b")],
      deletes: [],
      nextSyncToken: "token-1",
    })
    expect(changed).toBe(2)
    const rows = await stored(PRIMARY)
    expect(rows.map((r) => r.externalId)).toEqual(["a", "b"])
    expect(rows[0]).toMatchObject({
      title: "Event a",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      myResponse: "accepted",
      conference: [{ type: "video", pin: null }],
    })
    await vi.waitFor(() => expect(heard).toEqual([{ userId }]))
    await off()
    expect(
      (await t.services.calendar.syncTargets()).find(
        (s) => s.calendarId === PRIMARY
      )?.syncToken
    ).toBe("token-1")
  })

  it("applies incremental changes: updates, deletions, nothing else", async () => {
    const changed = await t.services.calendar.applySync(userId, PRIMARY, {
      full: false,
      upserts: [event("a", { title: "Moved", myResponse: "declined" })],
      deletes: ["b", "never-seen"],
      nextSyncToken: "token-2",
    })
    expect(changed).toBe(2)
    expect(await stored(PRIMARY)).toEqual([
      expect.objectContaining({ externalId: "a", title: "Moved" }),
    ])
  })

  it("a full resync replaces the calendar's events", async () => {
    await t.services.calendar.applySync(userId, PRIMARY, {
      full: true,
      upserts: [event("c")],
      deletes: [],
      nextSyncToken: "token-3",
    })
    expect((await stored(PRIMARY)).map((r) => r.externalId)).toEqual(["c"])
  })

  it("keeps the token through errors", async () => {
    await t.services.calendar.recordSyncError(
      userId,
      TEAM,
      "Google returned 404"
    )
    await t.services.calendar.recordSyncError(
      userId,
      PRIMARY,
      "Couldn't reach Google"
    )
    const status = await t.services.calendar.syncStatus(userId)
    expect(status).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendarId: TEAM,
          lastError: "Google returned 404",
        }),
      ])
    )
    const token = async () =>
      (await t.services.calendar.syncTargets()).find(
        (s) => s.calendarId === PRIMARY
      )?.syncToken
    expect(await token()).toBe("token-3")
    // A week after the last full sync, the next one is full again.
    const week = new Date(Date.now() + 8 * 86_400_000)
    expect(
      (await t.services.calendar.syncTargets(week)).find(
        (s) => s.calendarId === PRIMARY
      )?.syncToken
    ).toBeNull()
  })

  it("forgets calendars that are deselected or disconnected", async () => {
    await t.services.calendar.applySync(userId, TEAM, {
      full: true,
      upserts: [event("t1")],
      deletes: [],
      nextSyncToken: "team-1",
    })
    await t.services.integrations.setResources(userId, "google", [
      resource(TEAM, "Team"),
    ])
    const targets = await t.services.calendar.syncTargets()
    expect(await t.services.calendar.retainOnly(targets)).toBe(1)
    expect(await stored(PRIMARY)).toEqual([])
    expect((await stored(TEAM)).map((r) => r.externalId)).toEqual(["t1"])
    expect(
      (await t.services.calendar.syncStatus(userId)).map((s) => s.calendarId)
    ).toEqual([TEAM])

    await t.services.integrations.disconnect(
      userActor({ id: userId, name: "Chris" }),
      "google"
    )
    expect(
      await t.services.calendar.retainOnly(
        await t.services.calendar.syncTargets()
      )
    ).toBe(1)
    expect(await stored(TEAM)).toEqual([])
  })
})

describe("calendar reads", () => {
  let me: string
  const at = (iso: string) => new Date(iso)
  beforeAll(async () => {
    me = (await t.seed.user()).id
    await t.services.calendar.applySync(me, PRIMARY, {
      full: true,
      upserts: [
        event("standup", {
          title: "Standup",
          startAt: at("2026-11-12T14:00:00Z"),
          endAt: at("2026-11-12T14:15:00Z"),
        }),
        event("holiday", {
          title: "Holiday",
          allDay: true,
          startAt: at("2026-11-12T00:00:00Z"),
          endAt: at("2026-11-13T00:00:00Z"),
        }),
        event("declined", {
          title: "Skipped",
          myResponse: "declined",
          startAt: at("2026-11-12T13:00:00Z"),
          endAt: at("2026-11-12T13:30:00Z"),
        }),
        event("focus", {
          title: "Focus",
          eventType: "focusTime",
          startAt: at("2026-11-12T12:00:00Z"),
          endAt: at("2026-11-12T13:00:00Z"),
        }),
        event("later", {
          title: "Next week",
          startAt: at("2026-11-19T14:00:00Z"),
          endAt: at("2026-11-19T15:00:00Z"),
        }),
      ],
      deletes: [],
      nextSyncToken: "t",
    })
  })

  it("lists what overlaps a range, all-day first", async () => {
    const day = await t.services.calendar.list(me, {
      start: at("2026-11-12T00:00:00Z"),
      end: at("2026-11-13T00:00:00Z"),
    })
    expect(day.map((e) => e.title)).toEqual([
      "Holiday",
      "Focus",
      "Skipped",
      "Standup",
    ])
    expect(day[0]).not.toHaveProperty("userId")
    expect(
      await t.services.calendar.list(otherId, {
        start: at("2026-11-12T00:00:00Z"),
        end: at("2026-11-13T00:00:00Z"),
      })
    ).toEqual([])
  })

  it("gets one of the user's events, and only theirs", async () => {
    const standup = (
      await t.services.calendar.list(me, {
        start: at("2026-11-12T14:00:00Z"),
        end: at("2026-11-12T14:01:00Z"),
      })
    ).find((e) => e.title === "Standup")
    expect((await t.services.calendar.get(me, standup!.id)).title).toBe(
      "Standup"
    )
    await expect(t.services.calendar.get(otherId, standup!.id)).rejects.toThrow(
      NotFoundError
    )
  })

  it("finds the meeting on now or next, skipping declined and focus time", async () => {
    const next = (iso: string) =>
      t.services.calendar.next(me, at(iso)).then((e) => e?.title ?? null)
    expect(await next("2026-11-12T11:30:00Z")).toBe("Standup")
    expect(await next("2026-11-12T14:10:00Z")).toBe("Standup")
    expect(await next("2026-11-12T14:20:00Z")).toBeNull()
    expect(await next("2026-11-18T15:00:00Z")).toBe("Next week")
  })
})
