import { userActor } from "@workspace/db/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
beforeAll(async () => {
  h = await createMcpHarness()
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("activity tools", () => {
  it("shows a task's history with readable summaries, newest first", async () => {
    const { task } = await call("create_task", { title: "Renew passport" })
    await call("update_task", {
      task: task.ref,
      status: "in_progress",
      priority: "high",
    })
    const { events } = await call("get_activity", { task: task.ref })
    expect(events.map((e: { summary: string }) => e.summary)).toEqual([
      "Claude Code moved it from todo to in_progress",
      'Claude Code changed priority from "none" to "high"',
      "Claude Code created the task",
    ])
    expect(events[0]).toMatchObject({
      task: { ref: task.ref, title: "Renew passport" },
      actor: { type: "agent", name: "Claude Code" },
      type: "status_changed",
      details: { from: "todo", to: "in_progress" },
    })
  })

  it("catches up on the user's changes since a cursor, skipping its own", async () => {
    const first = await call("get_updates_since")
    expect(first.events).toEqual([]) // only the agent has changed anything so far
    expect(first.hasMore).toBe(false)

    const me = userActor({ id: h.userId, name: "Chris" })
    const created = await h.t.services.tasks.create(me, {
      title: "Call the bank",
    })
    await h.t.services.tasks.update(me, created.id, { status: "done" })

    const updates = await call("get_updates_since", {
      cursor: first.cursor ?? 0,
    })
    expect(updates.events.map((e: { summary: string }) => e.summary)).toEqual([
      "Chris created the task",
      "Chris moved it from todo to done",
    ])
    expect(
      (await call("get_updates_since", { cursor: updates.cursor })).events
    ).toEqual([])
  })

  it("can include its own changes and page through them", async () => {
    const page = await call("get_updates_since", {
      include_mine: true,
      limit: 2,
    })
    expect(page.events).toHaveLength(2)
    expect(page.hasMore).toBe(true)
    const agentOnly = await call("get_updates_since", {
      include_mine: true,
      actors: ["agent"],
    })
    expect(
      agentOnly.events.every(
        (e: { actor: { type: string } }) => e.actor.type === "agent"
      )
    ).toBe(true)
  })
})
