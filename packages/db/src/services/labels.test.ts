import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../actor"
import { NotFoundError, ValidationError } from "../errors"
import { createTestDatabase, type TestDatabase } from "../testing"

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

const labels = () => t.services.labels

describe("labels", () => {
  it("creates and lists by name; names are unique case-insensitively", async () => {
    await labels().create(me, { name: "Work", color: "blue" })
    await labels().create(me, { name: "errand" })
    expect((await labels().list(me.userId)).map((l) => l.name)).toEqual([
      "errand",
      "Work",
    ])
    await expect(labels().create(claude, { name: "work" })).rejects.toThrow(
      ValidationError
    )
  })

  it("renames and recolours, rejecting a duplicate name", async () => {
    const l = await labels().create(me, { name: "Draft" })
    expect(
      await labels().update(me, l.id, { name: "Ideas", color: "violet" })
    ).toEqual({
      id: l.id,
      name: "Ideas",
      color: "violet",
    })
    await expect(labels().update(me, l.id, { name: "WORK" })).rejects.toThrow(
      /already exists/
    )
  })

  it("ensure() reuses labels by name and creates missing ones", async () => {
    const ensured = await labels().ensure(claude, ["work", "Waiting"])
    expect(ensured.map((l) => l.name)).toEqual(["Work", "Waiting"])
    expect((await labels().ensure(claude, ["waiting"]))[0]?.id).toBe(
      ensured[1]?.id
    )
  })

  it("setForTask assigns labels and records added/removed by the actor", async () => {
    const task = await t.services.tasks.create(me, { title: "Groceries" })
    const [work, waiting] = await labels().ensure(me, ["Work", "Waiting"])
    await labels().setForTask(claude, task.id, [work!.id, waiting!.id])
    await labels().setForTask(claude, task.id, [waiting!.id])

    expect(
      (await t.services.tasks.get(me.userId, task.id)).labels.map((l) => l.name)
    ).toEqual(["Waiting"])
    const events = (await t.services.activity.forTask(me.userId, task.id)).map(
      (e) => e.payload
    )
    expect(events.slice(0, 3)).toEqual([
      { type: "label_removed", labelId: work!.id, name: "Work" },
      { type: "label_added", labelId: work!.id, name: "Work" },
      { type: "label_added", labelId: waiting!.id, name: "Waiting" },
    ])
  })

  it("setForTask is a no-op when nothing changes and rejects unknown labels", async () => {
    const task = await t.services.tasks.create(me, { title: "No-op" })
    await labels().setForTask(me, task.id, [])
    expect(await t.services.activity.forTask(me.userId, task.id)).toHaveLength(
      1
    )
    await expect(labels().setForTask(me, task.id, ["missing"])).rejects.toThrow(
      NotFoundError
    )
    await expect(labels().setForTask(me, "missing-task", [])).rejects.toThrow(
      NotFoundError
    )
  })

  it("only the user can delete a label; it leaves tasks and frees the name", async () => {
    const task = await t.services.tasks.create(me, { title: "Tagged" })
    const [temp] = await labels().ensure(me, ["Temp"])
    await labels().setForTask(me, task.id, [temp!.id])
    await expect(labels().softDelete(claude, temp!.id)).rejects.toThrow(
      ForbiddenError
    )
    await labels().softDelete(me, temp!.id)
    expect((await t.services.tasks.get(me.userId, task.id)).labels).toEqual([])
    await expect(labels().create(me, { name: "temp" })).resolves.toMatchObject({
      name: "temp",
    })
  })
})
