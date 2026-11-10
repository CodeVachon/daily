import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { agentActor, userActor } from "./actor"
import { createChangeFeed, type Listen, type TaskChange } from "./changes"
import { createTestDatabase, type TestDatabase } from "./testing"

/** A fake LISTEN connection we can push payloads through. */
function fakeListen() {
  let push: ((payload: string) => void) | null = null
  const stop = vi.fn(async () => {
    push = null
  })
  const listen: Listen = vi.fn(async (_channel, onPayload) => {
    push = onPayload
    return stop
  })
  return { listen, stop, send: (payload: string) => push?.(payload) }
}

const change = (userId: string, seq = 1) =>
  JSON.stringify({
    seq,
    userId,
    taskId: "t",
    actorType: "user",
    clientId: null,
  })

describe("createChangeFeed", () => {
  it("listens once, fans out per user, and stops when the last leaves", async () => {
    const bus = fakeListen()
    const feed = createChangeFeed(bus.listen)
    const a: TaskChange[] = []
    const b: TaskChange[] = []
    const offA = await feed.subscribe("a", (c) => a.push(c))
    const offB = await feed.subscribe("b", (c) => b.push(c))
    expect(bus.listen).toHaveBeenCalledTimes(1)

    bus.send(change("a", 1))
    bus.send(change("b", 2))
    bus.send("not json")
    bus.send(JSON.stringify({ hello: "world" }))
    expect(a.map((c) => c.seq)).toEqual([1])
    expect(b.map((c) => c.seq)).toEqual([2])

    await offA()
    expect(bus.stop).not.toHaveBeenCalled()
    await offB()
    expect(bus.stop).toHaveBeenCalledTimes(1)

    await feed.subscribe("a", () => {})
    expect(bus.listen).toHaveBeenCalledTimes(2)
  })

  it("lets a failed listen be retried", async () => {
    let fail = true
    const listen: Listen = async () => {
      if (fail) throw new Error("connection refused")
      return async () => {}
    }
    const feed = createChangeFeed(listen)
    await expect(feed.subscribe("a", () => {})).rejects.toThrow(/refused/)
    fail = false
    await expect(feed.subscribe("a", () => {})).resolves.toBeTypeOf("function")
  })
})

describe("task events reach subscribers (PGlite LISTEN/NOTIFY)", () => {
  let t: TestDatabase
  beforeAll(async () => {
    t = await createTestDatabase()
  })
  afterAll(() => t.close())

  it("announces each committed event to its owner only", async () => {
    const me = await t.seed.user()
    const other = await t.seed.user()
    const task = await t.seed.task(me.id)
    const mine: TaskChange[] = []
    const theirs: TaskChange[] = []
    const off = await t.services.changes.subscribe(me.id, (c) => mine.push(c))
    await t.services.changes.subscribe(other.id, (c) => theirs.push(c))

    await t.services.comments.add(userActor(me), task.id, "Hello")
    await t.services.checklist.add(
      agentActor(me.id, "claude-code", "Claude Code"),
      task.id,
      "Step"
    )
    await vi.waitFor(() => expect(mine).toHaveLength(2))
    expect(mine[0]).toMatchObject({
      userId: me.id,
      taskId: task.id,
      actorType: "user",
      clientId: null,
    })
    expect(mine[1]).toMatchObject({
      actorType: "agent",
      clientId: "claude-code",
    })
    expect(mine[1]!.seq).toBeGreaterThan(mine[0]!.seq)
    expect(theirs).toEqual([])

    await off()
    await t.services.comments.add(userActor(me), task.id, "Again")
    await new Promise((r) => setTimeout(r, 20))
    expect(mine).toHaveLength(2)
  })
})
