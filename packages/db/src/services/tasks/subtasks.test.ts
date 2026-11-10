import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, userActor, type Actor } from "../../actor"
import { ValidationError } from "../../errors"
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
const events = async (id: string) =>
  (await t.services.activity.forTask(me.userId, id)).map((e) => e.payload)

describe("subtasks", () => {
  it("records subtask_added on the parent when created under it", async () => {
    const parent = await tasks().create(me, { title: "Move house" })
    const child = await tasks().create(claude, {
      title: "Book movers",
      parentTaskId: `#${parent.number}`,
    })
    expect(child.parentTaskId).toBe(parent.id)
    expect((await events(parent.id))[0]).toEqual({
      type: "subtask_added",
      subtaskId: child.id,
      title: "Book movers",
    })
  })

  it("attaches, moves and detaches with history on both parents", async () => {
    const a = await tasks().create(me, { title: "A" })
    const b = await tasks().create(me, { title: "B" })
    const child = await tasks().create(me, { title: "child" })

    await tasks().setParent(claude, child.id, a.id)
    const moved = await tasks().setParent(me, child.id, b.number)
    expect(moved.parentTaskId).toBe(b.id)
    expect((await events(a.id)).slice(0, 2).map((e) => e.type)).toEqual([
      "subtask_detached",
      "subtask_added",
    ])
    expect((await events(child.id))[0]).toEqual({
      type: "updated",
      changes: [{ field: "parentTaskId", from: a.id, to: b.id }],
    })

    expect(
      (await tasks().setParent(me, child.id, null)).parentTaskId
    ).toBeNull()
    expect((await events(b.id))[0]?.type).toBe("subtask_detached")
  })

  it("is a no-op when the parent doesn't change", async () => {
    const parent = await tasks().create(me, { title: "P" })
    const child = await tasks().create(me, {
      title: "C",
      parentTaskId: parent.id,
    })
    const before = (await events(child.id)).length
    await tasks().setParent(me, child.id, parent.id)
    expect(await events(child.id)).toHaveLength(before)
  })

  it("rejects cycles", async () => {
    const top = await tasks().create(me, { title: "top" })
    const mid = await tasks().create(me, { title: "mid", parentTaskId: top.id })
    const leaf = await tasks().create(me, {
      title: "leaf",
      parentTaskId: mid.id,
    })
    await expect(tasks().setParent(me, top.id, leaf.id)).rejects.toThrow(
      ValidationError
    )
    await expect(tasks().setParent(me, top.id, top.id)).rejects.toThrow(
      /one of its subtasks/
    )
  })

  it("summarizes subtask progress, ignoring cancelled and deleted subtasks", async () => {
    const parent = await tasks().create(me, { title: "Launch" })
    const make = (title: string, status: string) =>
      tasks().create(me, { title, status, parentTaskId: parent.id })
    await make("done one", "done")
    await make("open one", "todo")
    await make("dropped", "cancelled")
    const gone = await make("deleted", "done")
    await tasks().softDelete(me, gone.id)

    const detail = await tasks().get(me.userId, parent.id)
    expect(detail.progress.subtasks).toEqual({ done: 1, total: 2 })
    expect(detail.subtasks.map((s) => s.title)).toEqual([
      "done one",
      "open one",
      "dropped",
    ])
    const [summary] = (await tasks().list(me.userId, { text: "Launch" })).tasks
    expect(summary?.progress).toEqual({
      checklist: { done: 0, total: 0 },
      subtasks: { done: 1, total: 2 },
    })
  })
})
