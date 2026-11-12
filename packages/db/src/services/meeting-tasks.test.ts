import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { userActor } from "../actor"
import type { CalendarEventInput } from "../calendar-inputs"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let userId: string
const CAL = "me@example.com"
const HOUR = 3_600_000
const now = new Date("2026-11-11T12:00:00Z")
const at = (hours: number) => new Date(now.getTime() + hours * HOUR)
const me = {
  email: CAL,
  name: null,
  self: true,
  response: "accepted" as const,
  optional: false,
  organizer: false,
  resource: false,
}
const boss = { ...me, email: "boss@example.com", self: false, organizer: true }

const meeting = (
  externalId: string,
  over: Partial<CalendarEventInput> = {}
): CalendarEventInput => ({
  externalId,
  title: externalId,
  description: null,
  location: null,
  startAt: at(2),
  endAt: at(3),
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
  htmlLink: null,
  recurringEventId: null,
  attachments: [],
  visibility: null,
  remoteUpdatedAt: null,
  ...over,
})

const sync = (upserts: CalendarEventInput[], deletes: string[] = []) =>
  t.services.calendar.applySync(userId, CAL, {
    full: false,
    upserts,
    deletes,
    nextSyncToken: "t",
  })

const reconcile = (when = now) =>
  t.services.meetingTasks.reconcile(userId, when)

async function taskFor(title: string) {
  const { tasks } = await t.services.tasks.list(userId, {
    text: title,
    status: ["open", "active", "done", "cancelled"],
  })
  return tasks.find((x) => x.title === title) ?? null
}

beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
  await t.services.integrations.connect(userId, {
    provider: "google",
    account: CAL,
    credentials: { refreshToken: "r", accessToken: "a", expiresAt: "x" },
  })
  await t.services.integrations.setResources(userId, "google", [
    {
      externalId: CAL,
      key: CAL,
      name: CAL,
      url: "https://calendar.google.com",
    },
  ])
  await sync([
    meeting("Standup"),
    meeting("Maybe", { myResponse: "tentative" }),
    meeting("Skipped", { myResponse: "declined" }),
    meeting("Earlier", { startAt: at(-3), endAt: at(-2) }),
    meeting("Offsite", { allDay: true }),
    meeting("Far", { startAt: at(24 * 20), endAt: at(24 * 20 + 1) }),
  ])
})
afterAll(() => t.close())

describe("meeting tasks", () => {
  it("creates a task for each upcoming meeting I'm going to", async () => {
    expect(await reconcile()).toEqual({ created: 1, updated: 0 })
    const task = await t.services.tasks.get(
      userId,
      (await taskFor("Standup"))!.id
    )
    expect(task).toMatchObject({
      title: "Standup",
      status: { key: "todo" },
      due: { kind: "instant", at: at(2), timezone: "America/Toronto" },
      labels: [expect.objectContaining({ name: "meeting" })],
      createdBy: { type: "system", label: "sync" },
    })
    expect(task.description).toContain("Join: https://meet.google.com/abc")
    for (const title of ["Maybe", "Skipped", "Earlier", "Offsite", "Far"])
      expect(await taskFor(title)).toBeNull()
    expect(await reconcile()).toEqual({ created: 0, updated: 0 })
    expect(
      await t.services.meetingTasks.taskFor(userId, {
        calendarId: CAL,
        externalId: "Standup",
      })
    ).toBe(task.number)
    expect(
      await t.services.meetingTasks.taskFor(userId, {
        calendarId: CAL,
        externalId: "Maybe",
      })
    ).toBeNull()
  })

  it("follows a new title and time", async () => {
    await sync([], ["Standup"])
    await sync([
      meeting("Standup", {
        title: "Daily standup",
        startAt: at(4),
        endAt: at(5),
      }),
    ])
    expect(await reconcile()).toEqual({ created: 0, updated: 1 })
    const task = await taskFor("Daily standup")
    expect(task?.due).toMatchObject({ at: at(4) })
  })

  it("cancels when I decline, and reopens when I accept again", async () => {
    const id = (await taskFor("Daily standup"))!.id
    const event = (
      await t.services.calendar.list(userId, { start: at(0), end: at(10) })
    ).find((e) => e.externalId === "Standup")!
    await t.services.calendar.setMyResponse(userId, event.id, "declined")
    await reconcile()
    expect((await t.services.tasks.get(userId, id)).status.key).toBe(
      "cancelled"
    )
    await t.services.calendar.setMyResponse(userId, event.id, "accepted")
    await reconcile()
    expect((await t.services.tasks.get(userId, id)).status.key).toBe("todo")
  })

  it("moves it to Done once the meeting is over, and only once", async () => {
    const id = (await taskFor("Daily standup"))!.id
    expect(await reconcile(at(6))).toEqual({ created: 0, updated: 1 })
    expect((await t.services.tasks.get(userId, id)).status.category).toBe(
      "done"
    )
    // I reopen it: it stays open.
    await t.services.tasks.update(
      userActor({ id: userId, name: "Chris" }),
      id,
      {
        status: "todo",
      }
    )
    expect(await reconcile(at(7))).toEqual({ created: 0, updated: 0 })
    expect((await t.services.tasks.get(userId, id)).status.key).toBe("todo")
  })

  it("cancels when the meeting is deleted; leaves done and deleted tasks alone", async () => {
    await sync([meeting("Review", { startAt: at(30), endAt: at(31) })])
    await sync([meeting("Retro", { startAt: at(30), endAt: at(31) })])
    await sync([meeting("Demo", { startAt: at(30), endAt: at(31) })])
    expect(await reconcile()).toMatchObject({ created: 3 })
    const user = userActor({ id: userId, name: "Chris" })
    await t.services.tasks.update(user, (await taskFor("Retro"))!.id, {
      status: "done",
    })
    await t.services.tasks.softDelete(user, (await taskFor("Demo"))!.id)
    await sync(
      [
        meeting("Retro", {
          title: "Retro (moved)",
          startAt: at(40),
          endAt: at(41),
        }),
        meeting("Demo", {
          title: "Demo (moved)",
          startAt: at(40),
          endAt: at(41),
        }),
      ],
      ["Review"]
    )
    expect(await reconcile()).toEqual({ created: 0, updated: 1 })
    expect((await taskFor("Review"))?.status.key).toBe("cancelled")
    expect((await taskFor("Retro"))?.status.key).toBe("done")
    expect(
      await t.services.meetingTasks.taskFor(userId, {
        calendarId: CAL,
        externalId: "Demo",
      })
    ).toBeNull()
  })

  it("leaves tasks alone when the calendar stops syncing", async () => {
    await t.services.integrations.setResources(userId, "google", [])
    await t.services.calendar.retainOnly(
      await t.services.calendar.syncTargets()
    )
    expect(await reconcile()).toEqual({ created: 0, updated: 0 })
    expect((await taskFor("Daily standup"))?.status.key).toBe("todo")
  })
})
