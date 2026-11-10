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
const errorOf = async (name: string, args: object) =>
  (await h.callTool(name, args)).content[0].text

describe("projects", () => {
  it("creates, renames, archives and lists projects", async () => {
    const { project } = await call("create_project", {
      name: "Home reno",
      color: "amber",
    })
    expect(project).toEqual({
      id: project.id,
      name: "Home reno",
      color: "amber",
      archived: false,
    })
    const { project: renamed } = await call("update_project", {
      project: "home reno",
      name: "Kitchen",
      archived: true,
    })
    expect(renamed).toMatchObject({ name: "Kitchen", archived: true })
    expect((await call("list_projects")).projects).toEqual([])
    expect(
      (await call("list_projects", { include_archived: true })).projects.map(
        (p: { name: string }) => p.name
      )
    ).toEqual(["Kitchen"])
  })

  it("validates colours and unknown projects", async () => {
    expect(
      await errorOf("create_project", { name: "x", color: "chartreuse" })
    ).toMatch(/color/i)
    expect(
      await errorOf("update_project", { project: "Nope", name: "y" })
    ).toMatch(/Project "Nope"/)
  })
})

describe("labels", () => {
  it("creates, renames and lists labels; names are unique", async () => {
    await call("create_label", { name: "Errand", color: "green" })
    expect(await errorOf("create_label", { name: "errand" })).toMatch(
      /already exists/
    )
    const { label } = await call("update_label", {
      label: "ERRAND",
      name: "Errands",
    })
    expect(label).toMatchObject({ name: "Errands", color: "green" })
    expect(
      (await call("list_labels")).labels.map((l: { name: string }) => l.name)
    ).toEqual(["Errands"])
    expect(
      await errorOf("update_label", { label: "missing", name: "x" })
    ).toMatch(/not found/)
  })

  it("sets a task's labels by name, creating missing ones", async () => {
    const { task } = await call("create_task", { title: "Buy paint" })
    const { task: tagged } = await call("set_task_labels", {
      task: task.ref,
      labels: ["errands", "Weekend"],
    })
    expect(tagged.labels).toEqual(["Errands", "Weekend"])
    expect(
      (await call("set_task_labels", { task: task.ref, labels: [] })).task
        .labels
    ).toEqual([])
  })
})
