import { McpServer } from "@modelcontextprotocol/server"

import { type McpContext } from "./context"
import { toolModules } from "./tools"

export { contextFromAuthInfo, type McpContext } from "./context"
export { json, type ToolModule } from "./tools/types"

export const MCP_SERVER_INFO = { name: "daily", version: "0.0.1" } as const

/** Builds an MCP server with every tool bound to the calling user. */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions:
      "Tools for the daily app. All data is scoped to the signed-in user; call `whoami` to see who that is.",
  })
  for (const register of toolModules) register(server, ctx)
  return server
}
