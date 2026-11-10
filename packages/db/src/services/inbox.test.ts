import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, systemActor, userActor, type Actor } from "../actor"
import { describeEvent } from "../events"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let me: Actor
let agent: Actor
let a: { id: string; number: number }
let b: { id: string; number: number }
beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user()
  me = userActor(user)
  agent = agentActor(user.id, "claude-code", "Claude Code")
  a = await t.services.tasks.create(me, { title: "Alpha" })
  b = await t.services.tasks.create(me, { title: "Beta" })
})
afterAll(() => t.close())

describe("inbox", () => {
  it("ignores the user's own changes", async () => {
    expect(await t.services.inbox.count(me.userId)).toBe(0)
    expect(await t.services.inbox.list(me.userId)).toEqual([])
  })

  it("lists tasks agents and sync changed, newest first", async () => {
    await t.services.comments.add(agent, a.id, "Started")
    await t.services.checklist.add(agent, a.id, "Step one")
    await t.services.comments.add(systemActor(me.userId, "sync"), b.id, "x")

    expect(await t.services.inbox.count(me.userId)).toBe(2)
    const items = await t.services.inbox.list(me.userId)
    expect(items.map((i) => [i.task.title, i.unread])).toEqual([
      ["Beta", 1],
      ["Alpha", 2],
    ])
    expect(items[1]!.events.map((e) => describeEvent(e.payload))).toEqual([
      'added checklist item "Step one"',
      "commented",
    ])
    expect(
      await t.services.inbox.unreadTaskIds(me.userId, [a.id, "other"])
    ).toEqual(new Set([a.id]))
    expect(await t.services.inbox.unreadTaskIds(me.userId, [])).toEqual(
      new Set()
    )
  })

  it("caps events per task and tasks per page", async () => {
    const [item] = await t.services.inbox.list(me.userId, {
      limit: 1,
      perTask: 1,
    })
    expect(item!.task.title).toBe("Beta")
    expect(item!.events).toHaveLength(1)
  })

  it("clears a task when it's opened, until an agent changes it again", async () => {
    await t.services.inbox.markRead(me.userId, a.id)
    await t.services.inbox.markRead(me.userId, a.id)
    expect(await t.services.inbox.unreadTaskIds(me.userId)).toEqual(
      new Set([b.id])
    )
    await t.services.comments.add(me, a.id, "Thanks")
    expect(await t.services.inbox.count(me.userId)).toBe(1)
    await t.services.comments.add(agent, a.id, "Done")
    const alpha = (await t.services.inbox.list(me.userId)).find(
      (i) => i.task.id === a.id
    )
    expect(alpha?.unread).toBe(1)
  })

  it("marks everything read", async () => {
    await t.services.inbox.markAllRead(me.userId)
    await t.services.inbox.markAllRead(me.userId)
    expect(await t.services.inbox.count(me.userId)).toBe(0)
    await t.services.comments.add(agent, b.id, "One more")
    expect(await t.services.inbox.unreadTaskIds(me.userId)).toEqual(
      new Set([b.id])
    )
  })

  it("leaves out deleted tasks", async () => {
    await t.services.tasks.softDelete(me, b.number)
    expect(await t.services.inbox.count(me.userId)).toBe(0)
  })
})
