/**
 * Test-only: drive the real MCP HTTP handler against an in-memory database,
 * as the "Claude Code" agent acting for one user. Used by tool tests.
 */
import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"
import type { Fetch } from "@workspace/integrations"

import { authInfoFromClaims } from "./context"
import { createMcpRequestHandler } from "./index"

const RESOURCE = "https://daily.test/api/mcp"
const AGENT_CLIENT_ID = "claude-code"

export interface McpHarness {
  t: TestDatabase
  userId: string
  /** One JSON-RPC call; returns the parsed response body. */
  rpc(method: string, params?: object, sub?: string): Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  /** tools/call; returns `result` (structuredContent, content, isError). */
  callTool(name: string, args?: object, sub?: string): Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function createMcpHarness({
  userName = "Chris",
  timezone = "America/Toronto",
  version = undefined as string | undefined,
  /** Answers integration calls (GitHub, Jira); the network is never used. */
  fetch = (async () => {
    throw new Error("no network in tests")
  }) as Fetch,
} = {}): Promise<McpHarness> {
  const t = await createTestDatabase()
  const user = await t.seed.user({ name: userName })
  await t.seed.oauthClient({
    id: "harness-client",
    clientId: AGENT_CLIENT_ID,
    name: "Claude Code",
    redirectUris: ["http://127.0.0.1:1/cb"],
  })
  await t.services.settings.reportTimezone(user.id, timezone)
  const handler = createMcpRequestHandler(t.services, { version, fetch })

  async function rpc(method: string, params: object = {}, sub = user.id) {
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
          { sub, azp: AGENT_CLIENT_ID, scope: "openid profile" },
          "token",
          RESOURCE
        ),
      }
    )
    const text = await response.text()
    const data = text.split("\n").find((line) => line.startsWith("data:"))
    return JSON.parse(data ? data.slice(5) : text)
  }

  return {
    t,
    userId: user.id,
    rpc,
    callTool: async (name, args = {}, sub) =>
      (await rpc("tools/call", { name, arguments: args }, sub)).result,
  }
}
