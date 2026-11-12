import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { userActor, type Actor } from "../../actor"
import { createTestDatabase, type TestDatabase } from "../../testing"

let t: TestDatabase
let me: Actor
const ids: Record<string, string> = {}
// Fri 2026-11-13, 10:00 in Toronto / 07:00 in Vancouver.
const now = new Date("2026-11-13T15:00:00Z")

beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user({ name: "Chris" })
  me = userActor(user)
  await t.services.settings.reportTimezone(user.id, "America/Toronto")
  await t.query(
    `INSERT INTO project (id, user_id, name) VALUES ('p-home', '${user.id}', 'Home')`
  )
  await t.query(
    `INSERT INTO label (id, user_id, name) VALUES ('l-urgent', '${user.id}', 'urgent-ish')`
  )
  const make = async (
    key: string,
    input: Parameters<TestDatabase["services"]["tasks"]["create"]>[1]
  ) => {
    ids[key] = (await t.services.tasks.create(me, input)).id
  }
  await make("taxes", {
    title: "File taxes",
    description: "Gather receipts for the accountant",
    priority: "urgent",
    due: { kind: "date", date: "2026-11-12" },
    projectId: "p-home",
  })
  await make("call", {
    title: "Call plumber",
    due: { kind: "date", date: "2026-11-13" },
    status: "in_progress",
  })
  await make("standup", {
    title: "Standup notes",
    due: {
      kind: "instant",
      at: "2026-11-13T20:00:00Z",
      timezone: "America/Toronto",
    },
  })
  await make("review", {
    title: "Review PR",
    priority: "high",
    due: { kind: "date", date: "2026-11-15" },
  })
  await make("later", {
    title: "Read book",
    status: "backlog",
    due: { kind: "date", date: "2026-12-01" },
  })
  await make("shipped", {
    title: "Ship release",
    status: "done",
    due: { kind: "date", date: "2026-11-01" },
  })
  await make("nodue", { title: "Someday idea", status: "backlog" })
  await make("child", { title: "Receipts subtask", parentTaskId: ids.taxes })
  await t.query(
    `INSERT INTO task_label (task_id, label_id) VALUES ('${ids.review}', 'l-urgent')`
  )
})
afterAll(() => t.close())

const titles = async (
  filters: Parameters<TestDatabase["services"]["tasks"]["list"]>[1]
) =>
  (await t.services.tasks.list(me.userId, filters, now)).tasks.map(
    (x) => x.title
  )

describe("tasks.list filters", () => {
  it("filters by status key or category, in board order", async () => {
    expect(await titles({ status: ["backlog"] })).toEqual([
      "Read book",
      "Someday idea",
    ])
    expect(await titles({ status: ["active", "done"] })).toEqual([
      "Call plumber",
      "Ship release",
    ])
  })

  it("filters by priority, project and label", async () => {
    expect(await titles({ priority: ["urgent", "high"] })).toEqual([
      "File taxes",
      "Review PR",
    ])
    expect(await titles({ projectId: "p-home" })).toEqual(["File taxes"])
    expect(await titles({ labelId: "l-urgent" })).toEqual(["Review PR"])
  })

  it("finds overdue work (not finished) in my current zone", async () => {
    expect(await titles({ due: "overdue" })).toEqual(["File taxes"])
  })

  it("finds what's due today and this week", async () => {
    // Board order: Todo before In Progress.
    expect(await titles({ due: "today" })).toEqual([
      "Standup notes",
      "Call plumber",
    ])
    // Weeks start Sunday by default: Sun Nov 8 – Sat Nov 14.
    expect(await titles({ due: "week", orderBy: "due" })).toEqual([
      "File taxes",
      "Call plumber",
      "Standup notes",
    ])
  })

  it("follows the day my weeks start on", async () => {
    await t.services.settings.updateWeekStart(me.userId, 1)
    // Mon Nov 9 – Sun Nov 15.
    expect(await titles({ due: "week", orderBy: "due" })).toEqual([
      "File taxes",
      "Call plumber",
      "Standup notes",
      "Review PR",
    ])
    await t.services.settings.updateWeekStart(me.userId, 0)
  })

  it("finds tasks without a due date", async () => {
    expect(await titles({ due: "none" })).toEqual([
      "Someday idea",
      "Receipts subtask",
    ])
  })

  it("searches full text and task numbers", async () => {
    expect(await titles({ text: "receipts" })).toEqual([
      "File taxes",
      "Receipts subtask",
    ])
    expect(await titles({ text: "plumb" })).toEqual(["Call plumber"])
    const { number } = await t.services.tasks.get(me.userId, ids.review!)
    expect(await titles({ text: `#${number}` })).toEqual(["Review PR"])
  })

  it("filters subtasks and top-level tasks", async () => {
    expect(await titles({ parentTaskId: ids.taxes })).toEqual([
      "Receipts subtask",
    ])
    expect(await titles({ parentTaskId: null })).not.toContain(
      "Receipts subtask"
    )
  })

  it("pages with hasMore", async () => {
    const first = await t.services.tasks.list(
      me.userId,
      { orderBy: "updated", limit: 3 },
      now
    )
    expect(first.tasks).toHaveLength(3)
    expect(first.hasMore).toBe(true)
    const last = await t.services.tasks.list(
      me.userId,
      { orderBy: "updated", limit: 3, offset: 6 },
      now
    )
    expect(last.hasMore).toBe(false)
    expect(
      await t.services.tasks.list(me.userId, { text: "zzzz-nothing" }, now)
    ).toEqual({
      tasks: [],
      hasMore: false,
    })
  })

  it("hydrates project and labels on summaries", async () => {
    const [review] = (
      await t.services.tasks.list(me.userId, { labelId: "l-urgent" }, now)
    ).tasks
    expect(review?.labels).toEqual([
      { id: "l-urgent", name: "urgent-ish", color: null },
    ])
    const [taxes] = (
      await t.services.tasks.list(me.userId, { projectId: "p-home" }, now)
    ).tasks
    expect(taxes?.project).toEqual({ id: "p-home", name: "Home", color: null })
  })
})
