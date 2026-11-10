import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, systemActor, userActor } from "../actor"
import { createTestDatabase, type TestDatabase } from "../testing"
import { recordEvents } from "./activity"

let t: TestDatabase
let userId: string
let taskId: string
let otherTaskId: string

const me = () => userActor({ id: userId, name: "Chris" })
const claude = () => agentActor(userId, "claude", "Claude Code")
const codex = () => agentActor(userId, "codex", "Codex")
const sync = () => systemActor(userId, "sync")

beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
  taskId = (await t.seed.task(userId)).id
  otherTaskId = (await t.seed.task(userId)).id

  await recordEvents(t.db, claude(), taskId, [{ type: "created" }])
  await recordEvents(t.db, me(), taskId, [
    { type: "updated", changes: [{ field: "title", from: "A", to: "B" }] },
    { type: "status_changed", from: "todo", to: "in_progress" },
  ])
  await recordEvents(t.db, codex(), otherTaskId, [{ type: "created" }])
  await recordEvents(t.db, sync(), taskId, [
    {
      type: "link_synced",
      linkId: "l1",
      changes: [{ field: "state", from: "open", to: "merged" }],
    },
  ])
})
afterAll(() => t.close())

describe("recordEvents", () => {
  it("does nothing for an empty list", async () => {
    await recordEvents(t.db, me(), taskId, [])
    expect(await t.services.activity.forTask(userId, taskId)).toHaveLength(4)
  })

  it("rolls back with the transaction that made the change", async () => {
    await expect(
      t.db.transaction(async (tx) => {
        await recordEvents(tx, me(), taskId, [{ type: "reordered" }])
        throw new Error("write failed")
      })
    ).rejects.toThrow("write failed")
    const types = (await t.services.activity.forTask(userId, taskId)).map(
      (e) => e.payload.type
    )
    expect(types).not.toContain("reordered")
  })
})

describe("activity.forTask", () => {
  it("returns the timeline newest first, with actors", async () => {
    const events = await t.services.activity.forTask(userId, taskId)
    expect(events.map((e) => [e.payload.type, e.actor.label])).toEqual([
      ["link_synced", "sync"],
      ["status_changed", "Chris"],
      ["updated", "Chris"],
      ["created", "Claude Code"],
    ])
    expect(events[3]?.actor).toEqual(claude())
  })

  it("is scoped to the user", async () => {
    expect(await t.services.activity.forTask("someone-else", taskId)).toEqual(
      []
    )
  })
})

describe("activity.since", () => {
  it("pages oldest first with a cursor", async () => {
    const first = await t.services.activity.since(userId, { limit: 3 })
    expect(first.events.map((e) => e.payload.type)).toEqual([
      "created",
      "updated",
      "status_changed",
    ])
    expect(first.nextCursor).toBe(first.events[2]?.seq)

    const rest = await t.services.activity.since(userId, {
      after: first.nextCursor!,
      limit: 3,
    })
    expect(rest.events.map((e) => e.payload.type)).toEqual([
      "created",
      "link_synced",
    ])
    expect(rest.nextCursor).toBeNull()
  })

  it("filters by actor type (the inbox: agents and sync, not me)", async () => {
    const { events } = await t.services.activity.since(userId, {
      actorTypes: ["agent", "system"],
    })
    expect(events.map((e) => e.actor.label)).toEqual([
      "Claude Code",
      "Codex",
      "sync",
    ])
  })

  it("lets an agent skip its own changes", async () => {
    const { events } = await t.services.activity.since(userId, {
      excludeClientId: "claude",
    })
    expect(events.map((e) => e.actor.label)).toEqual([
      "Chris",
      "Chris",
      "Codex",
      "sync",
    ])
  })
})
