import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../actor"
import { NotFoundError, ValidationError } from "../errors"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let me: Actor
let claude: Actor
let taskId: string

beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user({ name: "Chris" })
  me = userActor(user)
  claude = agentActor(user.id, "claude", "Claude Code")
  taskId = (await t.services.tasks.create(me, { title: "Release" })).id
})
afterAll(() => t.close())

const checklist = () => t.services.checklist
const texts = async () =>
  (await checklist().list(me.userId, taskId)).map((i) => i.text)
const lastEvent = async () =>
  (await t.services.activity.forTask(me.userId, taskId))[0]

describe("checklist", () => {
  it("adds items in order, by any actor", async () => {
    await checklist().add(me, taskId, "Write notes")
    await checklist().add(claude, taskId, " Tag release ")
    await checklist().add(claude, taskId, "Announce")
    expect(await texts()).toEqual(["Write notes", "Tag release", "Announce"])
    expect(await lastEvent()).toMatchObject({
      actor: claude,
      payload: { type: "checklist_added", text: "Announce" },
    })
    await expect(checklist().add(me, taskId, " ")).rejects.toThrow(/empty/)
  })

  it("toggles and renames, recording changes only when something changed", async () => {
    const [first] = await checklist().list(me.userId, taskId)
    expect((await checklist().toggle(claude, first!.id)).done).toBe(true)
    expect(await lastEvent()).toMatchObject({
      payload: { type: "checklist_toggled", done: true },
    })
    const before = (await t.services.activity.forTask(me.userId, taskId)).length
    await checklist().toggle(claude, first!.id, true)
    await checklist().rename(me, first!.id, "Write notes")
    expect(await t.services.activity.forTask(me.userId, taskId)).toHaveLength(
      before
    )

    expect(
      (await checklist().rename(me, first!.id, "Write release notes")).text
    ).toBe("Write release notes")
    expect((await lastEvent())?.payload.type).toBe("checklist_updated")
  })

  it("reorders after another item or to the top", async () => {
    const [notes, tag, announce] = await checklist().list(me.userId, taskId)
    await checklist().reorder(me, notes!.id, announce!.id)
    expect(await texts()).toEqual([
      "Tag release",
      "Announce",
      "Write release notes",
    ])
    await checklist().reorder(me, announce!.id, null)
    expect(await texts()).toEqual([
      "Announce",
      "Tag release",
      "Write release notes",
    ])
    await checklist().reorder(me, announce!.id, tag!.id)
    expect(await texts()).toEqual([
      "Tag release",
      "Announce",
      "Write release notes",
    ])
    await expect(checklist().reorder(me, tag!.id, tag!.id)).rejects.toThrow(
      ValidationError
    )
  })

  it("shows progress on the task", async () => {
    expect(
      (await t.services.tasks.get(me.userId, taskId)).progress.checklist
    ).toEqual({
      done: 1,
      total: 3,
    })
  })

  it("only the user can remove items", async () => {
    const [item] = await checklist().list(me.userId, taskId)
    await expect(checklist().remove(claude, item!.id)).rejects.toThrow(
      ForbiddenError
    )
    await checklist().remove(me, item!.id)
    expect(await texts()).not.toContain(item!.text)
    await expect(checklist().toggle(me, item!.id)).rejects.toThrow(
      NotFoundError
    )
    expect((await lastEvent())?.payload.type).toBe("checklist_removed")
  })

  it("is scoped to the user's tasks", async () => {
    const [item] = await checklist().list(me.userId, taskId)
    const stranger = userActor({ id: "someone-else", name: "Mallory" })
    await expect(checklist().toggle(stranger, item!.id)).rejects.toThrow(
      NotFoundError
    )
  })
})
