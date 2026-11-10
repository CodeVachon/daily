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

describe("list_unread_updates", () => {
  it("lists what agents changed that the user hasn't opened", async () => {
    expect((await call("list_unread_updates")).tasks).toEqual([])
    const { task } = await call("create_task", { title: "Draft the plan" })
    await call("add_comment", { task: task.ref, body: "First pass done" })

    const { tasks } = await call("list_unread_updates")
    expect(tasks).toEqual([
      expect.objectContaining({
        ref: task.ref,
        title: "Draft the plan",
        unread: 2,
      }),
    ])
    expect(tasks[0].changes.map((c: { summary: string }) => c.summary)).toEqual(
      ["Claude Code commented", "Claude Code created the task"]
    )

    await h.t.services.inbox.markRead(h.userId, task.id)
    expect((await call("list_unread_updates")).tasks).toEqual([])
  })
})
