import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
let ref: string
beforeAll(async () => {
  h = await createMcpHarness()
  const created = await h.callTool("create_task", {
    title: "Plan offsite",
    description: "Venue + agenda",
    priority: "high",
    due: "2026-11-20",
    labels: ["team"],
  })
  ref = created.structuredContent.task.ref
  await h.callTool("add_checklist_item", { task: ref, text: "Book venue" })
  await h.callTool("add_comment", {
    task: ref,
    body: "Looking at three venues",
  })
})
afterAll(() => h.t.close())

describe("server instructions", () => {
  it("explain statuses, due dates and the no-delete rule", async () => {
    const { result } = await h.rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    })
    expect(result.instructions).toMatch(/#number/)
    expect(result.instructions).toMatch(/current time zone/)
    expect(result.instructions).toMatch(/cannot delete/)
  })
})

describe("prompts", () => {
  it("lists the workflow prompts", async () => {
    const { result } = await h.rpc("prompts/list")
    expect(result.prompts.map((p: { name: string }) => p.name)).toEqual([
      "capture_task",
      "triage_inbox",
      "next_up",
    ])
  })

  it("capture_task folds in the hint and asks to search first", async () => {
    const { result } = await h.rpc("prompts/get", {
      name: "capture_task",
      arguments: { hint: "renew SSL cert" },
    })
    const text = result.messages[0].content.text
    expect(text).toMatch(/renew SSL cert/)
    expect(text).toMatch(/search_tasks/)
    expect(text).toMatch(/create_task/)
  })

  it("triage and next_up guide the agent to the right tools", async () => {
    const triage = (await h.rpc("prompts/get", { name: "triage_inbox" })).result
      .messages[0].content.text
    expect(triage).toMatch(/Never delete/)
    const next = (await h.rpc("prompts/get", { name: "next_up" })).result
      .messages[0].content.text
    expect(next).toMatch(/openBlockers/)
  })
})

describe("task resources", () => {
  it("lists open tasks as daily://task/{number}", async () => {
    const { result } = await h.rpc("resources/list")
    expect(result.resources).toContainEqual(
      expect.objectContaining({
        uri: `daily://task/${ref.slice(1)}`,
        name: `${ref} Plan offsite`,
      })
    )
    const templates = (await h.rpc("resources/templates/list")).result
      .resourceTemplates
    expect(
      templates.map((t: { uriTemplate: string }) => t.uriTemplate)
    ).toEqual(["daily://task/{ref}"])
  })

  it("reads a task as Markdown with checklist, comments and history", async () => {
    const { result } = await h.rpc("resources/read", {
      uri: `daily://task/${ref.slice(1)}`,
    })
    const text: string = result.contents[0].text
    expect(text).toMatch(new RegExp(`^# ${ref} Plan offsite`))
    expect(text).toMatch(/Priority: high/)
    expect(text).toMatch(/Due: Fri, Nov 20/)
    expect(text).toMatch(/- \[ \] Book venue/)
    expect(text).toMatch(/\*\*Claude Code\*\*.*\n.*three venues/)
    expect(text).toMatch(/Claude Code created the task/)
  })
})
