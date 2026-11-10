import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
beforeAll(async () => {
  h = await createMcpHarness({ userName: "Octo Cat" })
  await h.t.seed.account({
    id: "gh",
    accountId: "583231",
    providerId: "github",
    userId: h.userId,
  })
})
afterAll(() => h.t.close())

describe("system tools", () => {
  it("ping answers pong", async () => {
    const result = await h.callTool("ping")
    expect(result.structuredContent.message).toBe("pong")
    expect(Date.parse(result.structuredContent.time)).not.toBeNaN()
  })

  it("whoami returns the user, the agent's name, scopes and time zone", async () => {
    const result = await h.callTool("whoami")
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toMatchObject({
      user: { id: h.userId, name: "Octo Cat", image: null },
      github: { id: "583231" },
      client: {
        id: "claude-code",
        name: "Claude Code",
        scopes: ["openid", "profile"],
      },
      timezone: "America/Toronto",
    })
  })

  it("whoami reports an error when the token's user is gone", async () => {
    const result = await h.callTool("whoami", {}, "deleted-user")
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/no longer exists/)
  })
})
