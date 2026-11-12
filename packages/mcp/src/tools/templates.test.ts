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

describe("template tools", () => {
  it("lists and gets the standup template", async () => {
    const { templates } = await call("list_templates")
    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      key: "standup",
      is_default: true,
      updated_by: null,
    })
    const { template } = await call("get_template", { key: "standup" })
    expect(template.body).toBe(templates[0].body)
  })

  it("previews and saves an edit, with my mention", async () => {
    expect(
      await call("set_slack_member_id", { slack_member_id: "u1abcdef" })
    ).toEqual({ slack_member_id: "U1ABCDEF" })
    expect(await call("get_slack_member_id")).toEqual({
      slack_member_id: "U1ABCDEF",
    })
    const body = "{{mention}} standup for {{date}}"
    const { text } = await call("preview_template", { body })
    expect(text).toMatch(/^<@U1ABCDEF> standup for \w{3}, \w{3} \d+$/)
    const { template } = await call("update_template", { body })
    expect(template).toMatchObject({
      body,
      is_default: false,
      updated_by: "Claude Code",
    })
    expect((await call("preview_template")).text).toBe(text)
    expect((await call("draft_standup", { format: "slack" })).text).toBe(text)
  })

  it("explains a bad template or member ID", async () => {
    const bad = await h.callTool("update_template", { body: "{{nope}}" })
    expect(bad.isError).toBe(true)
    expect(bad.content[0].text).toContain("Unknown variable {{nope}}")
    const id = await h.callTool("set_slack_member_id", {
      slack_member_id: "@chris",
    })
    expect(id.isError).toBe(true)
  })
})
