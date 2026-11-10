import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../../actor"
import { NotFoundError, ValidationError } from "../../errors"
import { createTestDatabase, type TestDatabase } from "../../testing"

let t: TestDatabase
let me: Actor
let claude: Actor

beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user({ name: "Chris" })
  me = userActor(user)
  claude = agentActor(user.id, "claude", "Claude Code")
})
afterAll(() => t.close())

const tasks = () => t.services.tasks
const history = async (taskId: string) =>
  (await t.services.activity.forTask(me.userId, taskId)).map((e) => [
    e.payload.type,
    e.actor.label,
  ])

describe("statuses", () => {
  it("lists the board columns in order", async () => {
    expect((await tasks().statuses()).map((s) => s.key)).toEqual([
      "backlog",
      "todo",
      "in_progress",
      "blocked",
      "done",
      "cancelled",
    ])
  })

  it("resolves keys and categories, and explains unknown values", async () => {
    expect((await tasks().resolveStatus("blocked")).key).toBe("blocked")
    expect((await tasks().resolveStatus("active")).key).toBe("in_progress")
    await expect(tasks().resolveStatus("someday")).rejects.toThrow(
      ValidationError
    )
    await expect(tasks().resolveStatus("someday")).rejects.toThrow(
      /backlog, todo/
    )
  })
})

describe("create", () => {
  it("creates with defaults, a number and a created event by the actor", async () => {
    const task = await tasks().create(claude, { title: "  File taxes  " })
    expect(task).toMatchObject({
      title: "File taxes",
      description: "",
      status: { key: "todo", category: "open" },
      priority: "none",
      due: null,
      project: null,
      labels: [],
      createdBy: claude,
      updatedBy: claude,
      completedAt: null,
    })
    expect(task.number).toBeGreaterThan(0)
    expect(await history(task.id)).toEqual([["created", "Claude Code"]])
  })

  it("numbers tasks sequentially and appends them to the column", async () => {
    const a = await tasks().create(me, { title: "A", status: "backlog" })
    const b = await tasks().create(me, { title: "B", status: "backlog" })
    expect(b.number).toBe(a.number + 1)
    expect(b.boardPosition > a.boardPosition).toBe(true)
  })

  it("accepts both kinds of due date", async () => {
    const floating = await tasks().create(me, {
      title: "D",
      due: { kind: "date", date: "2026-11-13" },
    })
    expect(floating.due).toEqual({ kind: "date", date: "2026-11-13" })
    const fixed = await tasks().create(me, {
      title: "E",
      due: {
        kind: "instant",
        at: "2026-11-13T22:00:00Z",
        timezone: "America/Toronto",
      },
    })
    expect(fixed.due).toEqual({
      kind: "instant",
      at: new Date("2026-11-13T22:00:00Z"),
      timezone: "America/Toronto",
    })
  })

  it("stamps completedAt when created as done", async () => {
    expect(
      (await tasks().create(me, { title: "F", status: "done" })).completedAt
    ).toBeInstanceOf(Date)
  })

  it("validates input, status, project and parent", async () => {
    await expect(tasks().create(me, { title: "   " })).rejects.toThrow(
      /Title is required/
    )
    await expect(
      tasks().create(me, { title: "x", status: "nope" })
    ).rejects.toThrow(ValidationError)
    await expect(
      tasks().create(me, { title: "x", projectId: "missing" })
    ).rejects.toThrow(NotFoundError)
    await expect(
      tasks().create(me, { title: "x", parentTaskId: "missing" })
    ).rejects.toThrow(NotFoundError)
    await expect(
      tasks().create(me, {
        title: "x",
        due: { kind: "instant", at: "2026-01-01", timezone: "Nope/Nope" },
      })
    ).rejects.toThrow(/Unknown IANA time zone/)
  })

  it("creates subtasks under a parent", async () => {
    const parent = await tasks().create(me, { title: "Parent" })
    const child = await tasks().create(claude, {
      title: "Child",
      parentTaskId: parent.id,
    })
    expect(child.parentTaskId).toBe(parent.id)
    expect(
      (await tasks().get(me.userId, parent.id)).subtasks.map((s) => s.title)
    ).toEqual(["Child"])
  })
})

describe("get", () => {
  it("finds a task by id, number or #number", async () => {
    const task = await tasks().create(me, { title: "Find me" })
    for (const ref of [
      task.id,
      task.number,
      `#${task.number}`,
      String(task.number),
    ]) {
      expect((await tasks().get(me.userId, ref)).id).toBe(task.id)
    }
  })

  it("is scoped to the user", async () => {
    const task = await tasks().create(me, { title: "Mine" })
    await expect(tasks().get("someone-else", task.id)).rejects.toThrow(
      NotFoundError
    )
  })
})

describe("update", () => {
  it("records only the fields that changed, old → new, by the actor", async () => {
    const task = await tasks().create(me, { title: "Draft", priority: "low" })
    const updated = await tasks().update(claude, task.id, {
      title: "Final",
      priority: "low",
      due: { kind: "date", date: "2026-11-20" },
    })
    expect(updated).toMatchObject({ title: "Final", updatedBy: claude })
    const [latest] = await t.services.activity.forTask(me.userId, task.id)
    expect(latest?.payload).toEqual({
      type: "updated",
      changes: [
        { field: "title", from: "Draft", to: "Final" },
        { field: "due", from: null, to: { kind: "date", date: "2026-11-20" } },
      ],
    })
  })

  it("does nothing when nothing changed", async () => {
    const task = await tasks().create(me, { title: "Same" })
    await tasks().update(claude, task.id, { title: "Same", status: "todo" })
    expect(await history(task.id)).toEqual([["created", "Chris"]])
  })

  it("moves to the end of the new column and tracks completion", async () => {
    const task = await tasks().create(me, { title: "Ship it" })
    const done = await tasks().update(claude, task.id, { status: "done" })
    expect(done.status.key).toBe("done")
    expect(done.completedAt).toBeInstanceOf(Date)
    expect((await history(task.id))[0]).toEqual([
      "status_changed",
      "Claude Code",
    ])

    const reopened = await tasks().update(me, task.id, {
      status: "in_progress",
    })
    expect(reopened.completedAt).toBeNull()
  })

  it("can clear the due date", async () => {
    const task = await tasks().create(me, {
      title: "Due",
      due: { kind: "date", date: "2026-11-13" },
    })
    expect((await tasks().update(me, task.id, { due: null })).due).toBeNull()
  })
})

describe("move", () => {
  let column: string[]

  beforeEach(async () => {
    const names = ["one", "two", "three"]
    column = []
    for (const title of names) {
      column.push((await tasks().create(me, { title, status: "blocked" })).id)
    }
  })

  const order = async () =>
    (await tasks().list(me.userId, { status: ["blocked"] })).tasks.map(
      (x) => x.title
    )

  it("reorders within a column between neighbours", async () => {
    const [one, two, three] = column
    await tasks().move(me, three!, {
      status: "blocked",
      afterTaskId: one,
      beforeTaskId: two,
    })
    expect((await order()).slice(-3)).toEqual(["one", "three", "two"])
    expect((await history(three!))[0]).toEqual(["reordered", "Chris"])
  })

  it("places with one neighbour, or at the bottom with none", async () => {
    const [one, two, three] = column
    await tasks().move(me, one!, { status: "blocked", afterTaskId: three })
    expect((await order()).slice(-3)).toEqual(["two", "three", "one"])
    await tasks().move(me, one!, { status: "blocked", beforeTaskId: two })
    expect((await order()).slice(-3)).toEqual(["one", "two", "three"])
    await tasks().move(me, two!, { status: "blocked" })
    expect((await order()).slice(-3)).toEqual(["one", "three", "two"])
  })

  it("changes status when dropped in another column", async () => {
    const [one] = column
    const moved = await tasks().move(claude, one!, { status: "done" })
    expect(moved.status.key).toBe("done")
    expect(moved.completedAt).toBeInstanceOf(Date)
    expect((await history(one!))[0]).toEqual(["status_changed", "Claude Code"])
  })

  it("rejects neighbours from another column or in the wrong order", async () => {
    const [one, two] = column
    const other = await tasks().create(me, {
      title: "elsewhere",
      status: "todo",
    })
    await expect(
      tasks().move(me, one!, { status: "blocked", afterTaskId: other.id })
    ).rejects.toThrow(ValidationError)
    await expect(
      tasks().move(me, column[2]!, {
        status: "blocked",
        afterTaskId: two,
        beforeTaskId: one,
      })
    ).rejects.toThrow(/must be above/)
  })
})

describe("soft delete and restore", () => {
  it("agents can never delete", async () => {
    const task = await tasks().create(claude, { title: "Keep me" })
    await expect(tasks().softDelete(claude, task.id)).rejects.toThrow(
      ForbiddenError
    )
    expect((await tasks().get(me.userId, task.id)).deletedAt).toBeNull()
  })

  it("the user can delete and restore; deleted tasks leave lists", async () => {
    const task = await tasks().create(me, { title: "Oops" })
    await tasks().softDelete(me, task.id)
    await expect(tasks().update(me, task.id, { title: "x" })).rejects.toThrow(
      NotFoundError
    )
    const listed = (await tasks().list(me.userId, { limit: 200 })).tasks.map(
      (x) => x.id
    )
    expect(listed).not.toContain(task.id)
    const trash = (await tasks().list(me.userId, { deleted: true })).tasks.map(
      (x) => x.id
    )
    expect(trash).toContain(task.id)

    await expect(tasks().restore(claude, task.id)).rejects.toThrow(
      ForbiddenError
    )
    const restored = await tasks().restore(me, task.id)
    expect(restored.deletedAt).toBeNull()
    expect((await history(task.id)).slice(0, 2)).toEqual([
      ["restored", "Chris"],
      ["deleted", "Chris"],
    ])
  })

  it("restore needs a deleted task", async () => {
    const task = await tasks().create(me, { title: "Alive" })
    await expect(tasks().restore(me, task.id)).rejects.toThrow(NotFoundError)
  })
})
