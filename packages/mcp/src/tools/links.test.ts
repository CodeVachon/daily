import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
let task: { ref: string }

beforeAll(async () => {
  h = await createMcpHarness()
  task = (await call("create_task", { title: "Ship links" })).task
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("link tools", () => {
  it("links a PR as the agent and lists it", async () => {
    const { link } = await call("link_external", {
      task: task.ref,
      ref: "https://github.com/CodeVachon/daily/pull/3",
    })
    expect(link).toMatchObject({
      provider: "github",
      kind: "pr",
      key: "CodeVachon/daily#3",
      title: null,
      linked_by: { type: "agent", name: "Claude Code" },
    })
    const { links } = await call("list_task_links", { task: task.ref })
    expect(links.map((l: { key: string }) => l.key)).toEqual([
      "CodeVachon/daily#3",
    ])
  })

  it("finds the task tracking an item by shorthand", async () => {
    const { tasks } = await call("find_tasks_by_link", {
      ref: "CodeVachon/daily#3",
    })
    expect(tasks).toEqual([{ number: expect.any(Number), title: "Ship links" }])
  })

  it("explains what it can't parse", async () => {
    const result = await h.callTool("link_external", {
      task: task.ref,
      ref: "PROJ-1",
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/Connect Jira/)
  })

  it("offers no way to remove links", async () => {
    const { tools } = (await h.rpc("tools/list")).result
    const names = tools.map((t: { name: string }) => t.name)
    expect(names).toContain("link_external")
    expect(names.filter((n: string) => /unlink|remove_link/.test(n))).toEqual(
      []
    )
  })
})
