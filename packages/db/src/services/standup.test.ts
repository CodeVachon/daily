import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, userActor, type Actor } from "../actor"
import { ValidationError } from "../errors"
import { calendarDateIn } from "../time"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let me: Actor
const HOUR = 3_600_000
const DAY = 24 * HOUR
const today = () => calendarDateIn(new Date(), "UTC")
const daysFromNow = (n: number) =>
  calendarDateIn(new Date(Date.now() + n * DAY), "UTC")

async function task(title: string, status = "todo", due?: string) {
  return t.services.tasks.create(me, {
    title,
    status,
    ...(due ? { due: { kind: "date" as const, date: due } } : {}),
  })
}

const window = () => ({
  since: new Date(Date.now() - HOUR),
  now: new Date(Date.now() + 60_000),
})

beforeAll(async () => {
  t = await createTestDatabase()
  me = userActor(await t.seed.user())
})
afterAll(() => t.close())

describe("standup", () => {
  it("drafts done, in progress, blocked and up next, with links", async () => {
    const shipped = await task("Ship login", "in_progress")
    await t.services.links.add(
      me,
      shipped.id,
      "https://github.com/acme/web/pull/4"
    )
    const [link] = await t.services.links.list(me.userId, shipped.id)
    await t.services.links.recordSync(me.userId, link!.id, {
      ok: true,
      state: {
        kind: "pr",
        title: "Login",
        state: "merged",
        stateCategory: "merged",
        assignee: null,
        remoteUpdatedAt: null,
      },
    })
    await t.services.tasks.update(me, shipped.id, { status: "done" })
    await task("Write docs", "in_progress")
    const deploy = await task("Deploy", "todo")
    const db = await task("Provision DB", "todo")
    await t.services.dependencies.add(me, deploy.id, db.id)
    await task("Waiting on legal", "blocked")
    await task("Review PR", "todo", today())
    await task("Overdue invoice", "backlog", "2020-01-01")
    await task("Later", "todo", daysFromNow(30))
    await task("Someday", "todo")
    const meeting = await task("Standup meeting", "todo", today())
    const [label] = await t.services.labels.ensure(me, ["meeting"])
    await t.services.labels.setForTask(me, meeting.id, [label!.id])

    const draft = await t.services.standup.draft(me.userId, window())
    const titles = (key: keyof typeof draft.sections) =>
      draft.sections[key].map((i) => i.title)
    expect(titles("done")).toEqual(["Ship login"])
    expect(titles("inProgress")).toEqual(["Write docs"])
    expect(titles("blocked").sort()).toEqual(["Deploy", "Waiting on legal"])
    expect(titles("upNext").sort()).toEqual(["Overdue invoice", "Review PR"])
    expect(draft.sections.done[0]!.links).toEqual([
      {
        key: "acme/web#4",
        url: "https://github.com/acme/web/pull/4",
        state: "merged",
      },
    ])
    expect(
      draft.sections.blocked.find((i) => i.title === "Deploy")!.blockedBy
    ).toEqual([{ number: db.number, title: "Provision DB" }])
    expect(draft.timezone).toBe("UTC")
    expect(draft.markdown).toContain(
      `- #${shipped.number} Ship login · [acme/web#4](https://github.com/acme/web/pull/4) merged`
    )
    expect(draft.slack).toContain("*Done*")
    expect(draft.markdown).not.toContain("Standup meeting")
  })

  it("leaves out work finished before the window", async () => {
    const later = {
      since: new Date(Date.now() + 30_000),
      now: new Date(Date.now() + 60_000),
    }
    const draft = await t.services.standup.draft(me.userId, later)
    expect(draft.sections.done).toEqual([])
    expect(draft.sections.inProgress).toHaveLength(1)
  })

  it("starts the next draft from the last standup I posted", async () => {
    expect(await t.services.standup.history(me.userId)).toEqual([])
    const agent = agentActor(me.userId, "claude-code", "Claude Code")
    const postedAt = new Date()
    const post = await t.services.standup.record(agent, {
      body: "  **Standup**  ",
      channel: " #team ",
      postedAt,
    })
    expect(post).toMatchObject({
      body: "**Standup**",
      channel: "#team",
      postedAt,
      postedBy: agent,
    })
    expect(await t.services.standup.history(me.userId)).toEqual([post])
    const draft = await t.services.standup.draft(me.userId, {
      now: new Date(+postedAt + 1000),
    })
    expect(draft.since).toEqual(postedAt)
    expect(draft.sections.done).toEqual([])
  })

  it("rejects an empty body or a start in the future", async () => {
    await expect(
      t.services.standup.record(me, { body: "  " })
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      t.services.standup.draft(me.userId, {
        since: new Date(Date.now() + DAY),
      })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
