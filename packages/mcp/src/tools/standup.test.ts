import { userActor } from "@workspace/db/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness

beforeAll(async () => {
  h = await createMcpHarness()
  const me = userActor({ id: h.userId, name: "Chris" })
  const shipped = await h.t.services.tasks.create(me, {
    title: "Ship login",
    status: "in_progress",
  })
  await h.t.services.links.add(
    me,
    shipped.id,
    "https://github.com/acme/web/pull/4"
  )
  await h.t.services.tasks.update(me, shipped.id, { status: "done" })
  await h.t.services.tasks.create(me, {
    title: "Write docs",
    status: "in_progress",
  })
  await h.t.services.tasks.create(me, {
    title: "Invoice",
    status: "todo",
    due: { kind: "date", date: "2020-01-01" },
  })
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("standup tools", () => {
  it("drafts the standup as Markdown or Slack", async () => {
    const since = new Date(Date.now() - 3_600_000).toISOString()
    const draft = await call("draft_standup", { since })
    expect(draft.since).toBe(since)
    expect(draft.sections.done).toEqual([
      {
        number: 1,
        title: "Ship login",
        due: null,
        links: [
          {
            key: "acme/web#4",
            url: "https://github.com/acme/web/pull/4",
            state: null,
          },
        ],
        blocked_by: [],
      },
    ])
    expect(draft.sections.in_progress).toHaveLength(1)
    expect(draft.sections.up_next[0]).toMatchObject({
      title: "Invoice",
      due: "2020-01-01",
    })
    expect(draft.text).toContain("**Done**")
    const slack = await call("draft_standup", { since, format: "slack" })
    expect(slack.text).toContain(
      "<https://github.com/acme/web/pull/4|acme/web#4>"
    )
  })

  it("records a posted standup and lists it", async () => {
    const { standup } = await call("record_standup", {
      body: "Done: login",
      channel: "#team",
    })
    expect(standup).toMatchObject({
      body: "Done: login",
      channel: "#team",
      posted_by: "Claude Code",
    })
    expect((await call("list_standups")).standups).toEqual([standup])
  })

  it("explains a bad window", async () => {
    const result = await h.callTool("draft_standup", {
      since: new Date(Date.now() + 86_400_000).toISOString(),
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("in the past")
  })
})
