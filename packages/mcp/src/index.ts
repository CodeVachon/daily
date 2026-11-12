import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"
import type { Services } from "@workspace/db/core"
import {
  createIntegrations,
  type Fetch,
  type GoogleConfig,
} from "@workspace/integrations"

import { contextFromAuthInfo, type McpContext } from "./context"
import { toolModules } from "./tools"

export {
  authInfoFromClaims,
  bearerToken,
  contextFromAuthInfo,
  type McpContext,
} from "./context"
export { json, type ToolModule } from "./tools/types"

/**
 * Builds an MCP server with every tool bound to the calling user. `version`
 * is the app's release version, reported to clients in `initialize`.
 */
export function createMcpServer(ctx: McpContext, version = "dev"): McpServer {
  const server = new McpServer(
    { name: "daily", version },
    {
      instructions: [
        "Daily is the user's personal task manager. Use it to file follow-ups from conversations, look up what the user is working on, and record progress.",
        "Tasks are referred to as #number. Statuses are board columns (list_statuses); each has a category: open, active, done or cancelled. Priority is none, urgent, high, medium or low.",
        'Due dates: "2026-11-14" means that day wherever the user is; "2026-11-14T17:00" is 5pm in the user\'s current time zone (they travel; whoami shows it).',
        "Everything you change is attributed to you in the task's history. You cannot delete anything; set status cancelled instead.",
        "Search before creating to avoid duplicates. Use get_updates_since with your last cursor to catch up on what the user changed.",
      ].join("\n"),
    }
  )
  for (const register of toolModules) register(server, ctx)
  return server
}

export interface McpHandlerOptions {
  /** The app's release version, reported in `initialize`. */
  version?: string
  /** How integrations reach GitHub/Jira/Google (tests pass a fake). */
  fetch?: Fetch
  /** The Google OAuth client, to refresh Google access tokens. */
  google?: GoogleConfig | null
}

/**
 * Streamable-HTTP handler: one fresh server per request, built for the caller.
 * `legacy: "stateless"` also answers 2025-era clients (no sessions).
 */
export function createMcpRequestHandler(
  services: Services,
  { version, fetch, google }: McpHandlerOptions = {}
) {
  const integrations = createIntegrations({ services, fetch, google })
  return createMcpHandler(
    async ({ authInfo }) =>
      createMcpServer(
        await contextFromAuthInfo(authInfo, services, integrations),
        version
      ),
    { legacy: "stateless" }
  )
}
