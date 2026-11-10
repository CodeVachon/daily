import { userActor } from "@workspace/db/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
beforeAll(async () => {
  h = await createMcpHarness({ timezone: "America/Vancouver" })
  await h.t.services.projects.create(
    userActor({ id: h.userId, name: "Chris" }),
    { name: "Appello" }
  )
})
afterAll(() => h.t.close())

const call = async (name: string, args: object = {}) => {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("tool catalogue", () => {
  it("has no tool that deletes or removes data", async () => {
    const { result } = await h.rpc("tools/list")
    const names: string[] = result.tools.map(
      (tool: { name: string }) => tool.name
    )
    expect(names).toEqual(
      expect.arrayContaining([
        "create_task",
        "update_task",
        "move_task",
        "list_tasks",
      ])
    )
    expect(
      names.filter((name) => /delete|remove|destroy|purge/.test(name))
    ).toEqual([])
    for (const tool of result.tools) {
      expect(tool.annotations?.destructiveHint ?? false).toBe(false)
    }
  })

  it("lists statuses with categories", async () => {
    const { statuses } = await call("list_statuses")
    expect(statuses.map((s: { key: string }) => s.key)).toEqual([
      "backlog",
      "todo",
      "in_progress",
      "blocked",
      "done",
      "cancelled",
    ])
  })
})

describe("create_task", () => {
  it("files a task attributed to the agent with sensible defaults", async () => {
    const { task } = await call("create_task", {
      title: "Follow up with Appello on invoices",
    })
    expect(task).toMatchObject({
      ref: `#${task.number}`,
      status: { key: "todo", category: "open" },
      priority: "none",
      due: null,
      createdBy: { type: "agent", name: "Claude Code" },
    })
  })

  it("accepts due strings, a project by name, labels and a parent", async () => {
    const { task: parent } = await call("create_task", {
      title: "Quarter close",
    })
    const { task } = await call("create_task", {
      title: "Send invoices",
      description: "Use the **new** template",
      status: "in_progress",
      priority: "high",
      due: "2026-11-14T17:00",
      project: "appello",
      labels: ["finance", "Waiting"],
      parent: parent.ref,
    })
    expect(task).toMatchObject({
      description: "Use the **new** template",
      status: { key: "in_progress" },
      priority: "high",
      due: {
        kind: "instant",
        at: "2026-11-15T01:00:00.000Z",
        timezone: "America/Vancouver",
        display: "Sat, Nov 14, 5:00 PM PT",
      },
      project: { name: "Appello" },
      labels: ["finance", "Waiting"],
      parentTaskId: parent.id,
    })
    expect(
      (await call("get_task", { task: parent.number })).task.subtaskList
    ).toEqual([
      { ref: task.ref, title: "Send invoices", status: "in_progress" },
    ])
  })

  it("returns readable errors for bad input", async () => {
    const bad = async (args: object) =>
      (await h.callTool("create_task", args)).content[0].text
    expect(await bad({ title: "x", status: "someday" })).toMatch(
      /Unknown status "someday"/
    )
    expect(await bad({ title: "x", project: "Nope" })).toMatch(
      /Project "Nope".*Appello/
    )
    expect(await bad({ title: "x", due: "next friday" })).toMatch(
      /Can't read "next friday"/
    )
    expect(await bad({ title: "   " })).toMatch(/Title is required/)
  })
})

describe("update_task and move_task", () => {
  it("changes only the given fields and records the agent", async () => {
    const { task } = await call("create_task", {
      title: "Draft",
      due: "2026-11-20",
    })
    const { task: updated } = await call("update_task", {
      task: task.ref,
      title: "Final",
      priority: "urgent",
      due: null,
      labels: ["review"],
    })
    expect(updated).toMatchObject({
      title: "Final",
      priority: "urgent",
      due: null,
      labels: ["review"],
      updatedBy: { type: "agent", name: "Claude Code" },
    })
    const history = await h.t.services.activity.forTask(h.userId, task.id)
    expect(history.every((e) => e.actor.label === "Claude Code")).toBe(true)
  })

  it("moves between columns and positions", async () => {
    const make = async (title: string) =>
      (await call("create_task", { title, status: "blocked" })).task
    const a = await make("A")
    const b = await make("B")
    const c = await make("C")
    await call("move_task", {
      task: c.ref,
      status: "blocked",
      after: a.ref,
      before: b.ref,
    })
    const { tasks } = await call("list_tasks", { status: ["blocked"] })
    expect(tasks.map((t: { title: string }) => t.title)).toEqual([
      "A",
      "C",
      "B",
    ])

    const { task: done } = await call("move_task", {
      task: a.number,
      status: "done",
    })
    expect(done.status.key).toBe("done")
    expect(done.completedAt).not.toBeNull()
  })

  it("reports unknown tasks", async () => {
    expect(
      (await h.callTool("update_task", { task: "#9999", title: "x" }))
        .content[0].text
    ).toMatch(/Task #9999 not found/)
  })
})

describe("list_tasks and search_tasks", () => {
  it("filters by label name, priority and due window", async () => {
    const urgent = await call("list_tasks", { priority: ["urgent"] })
    expect(urgent.tasks.map((t: { title: string }) => t.title)).toEqual([
      "Final",
    ])
    const byLabel = await call("list_tasks", { label: "FINANCE" })
    expect(byLabel.tasks.map((t: { title: string }) => t.title)).toEqual([
      "Send invoices",
    ])
    expect(await call("list_tasks", { label: "no-such-label" })).toEqual({
      tasks: [],
      hasMore: false,
    })
    const top = await call("list_tasks", { parent: null, limit: 100 })
    expect(top.tasks.map((t: { title: string }) => t.title)).not.toContain(
      "Send invoices"
    )
  })

  it("searches text and #numbers, optionally skipping finished work", async () => {
    const found = await call("search_tasks", { query: "invoices" })
    expect(found.tasks.map((t: { title: string }) => t.title).sort()).toEqual([
      "Follow up with Appello on invoices",
      "Send invoices",
    ])
    const { task } = await call("get_task", { task: found.tasks[0].ref })
    expect((await call("search_tasks", { query: task.ref })).tasks[0].id).toBe(
      task.id
    )
    const open = await call("search_tasks", { query: "A", include_done: false })
    expect(
      open.tasks.map((t: { status: { category: string } }) => t.status.category)
    ).not.toContain("done")
  })
})
