import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"
import type { Services } from "@workspace/db/core"

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
    instructions: [
      "Daily is the user's personal task manager. Use it to file follow-ups from conversations, look up what the user is working on, and record progress.",
      "Tasks are referred to as #number. Statuses are board columns (list_statuses); each has a category: open, active, done or cancelled. Priority is none, urgent, high, medium or low.",
      'Due dates: "2026-11-14" means that day wherever the user is; "2026-11-14T17:00" is 5pm in the user\'s current time zone (they travel; whoami shows it).',
      "Everything you change is attributed to you in the task's history. You cannot delete anything; set status cancelled instead.",
      "Search before creating to avoid duplicates. Use get_updates_since with your last cursor to catch up on what the user changed.",
    ].join("\n"),
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
