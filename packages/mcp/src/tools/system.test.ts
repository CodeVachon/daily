import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"

import { authInfoFromClaims, createMcpRequestHandler } from "../index"

const RESOURCE = "https://daily.test/api/mcp"

let t: TestDatabase
let userId: string
beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user({ name: "Octo Cat" })
  userId = user.id
  await t.seed.account({
    id: "gh",
    accountId: "583231",
    providerId: "github",
    userId,
  })
})
afterAll(() => t.close())

/** Sends one JSON-RPC request through the real MCP HTTP handler. */
async function rpc(method: string, params: object, sub = userId) {
  const handler = createMcpRequestHandler(t.services)
  const response = await handler.fetch(
    new Request(RESOURCE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    {
      authInfo: authInfoFromClaims(
        { sub, azp: "claude-code", scope: "openid profile" },
        "token",
        RESOURCE
      ),
    }
  )
  const text = await response.text()
  const data = text.split("\n").find((line) => line.startsWith("data:"))
  return JSON.parse(data ? data.slice(5) : text)
}

const callTool = (name: string, sub?: string) =>
  rpc("tools/call", { name, arguments: {} }, sub)

describe("system tools", () => {
  it("lists ping and whoami", async () => {
    const { result } = await rpc("tools/list", {})
    expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "ping",
      "whoami",
    ])
  })

  it("ping answers pong", async () => {
    const { result } = await callTool("ping")
    expect(result.structuredContent.message).toBe("pong")
    expect(Date.parse(result.structuredContent.time)).not.toBeNaN()
  })

  it("whoami returns the calling user, GitHub id and token client", async () => {
    const { result } = await callTool("whoami")
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toMatchObject({
      user: { id: userId, name: "Octo Cat", image: null },
      github: { id: "583231" },
      client: { id: "claude-code", scopes: ["openid", "profile"] },
    })
  })

  it("whoami reports an error when the token's user is gone", async () => {
    const { result } = await callTool("whoami", "deleted-user")
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/no longer exists/)
  })
})
