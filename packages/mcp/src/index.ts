import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"
import type { Services } from "@workspace/db"

import { contextFromAuthInfo, type McpContext } from "./context"
import { toolModules } from "./tools"

export {
  authInfoFromClaims,
  bearerToken,
  contextFromAuthInfo,
  type McpContext,
} from "./context"
export { json, type ToolModule } from "./tools/types"

const MCP_SERVER_INFO = { name: "daily", version: "0.0.1" } as const

/** Builds an MCP server with every tool bound to the calling user. */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions:
      "Tools for the daily app. All data is scoped to the signed-in user; call `whoami` to see who that is.",
  })
  for (const register of toolModules) register(server, ctx)
  return server
}

/**
 * Streamable-HTTP handler: one fresh server per request, built for the caller.
 * `legacy: "stateless"` also answers 2025-era clients (no sessions).
 */
export function createMcpRequestHandler(services: Services) {
  return createMcpHandler(
    async ({ authInfo }) =>
      createMcpServer(await contextFromAuthInfo(authInfo, services)),
    { legacy: "stateless" }
  )
}
