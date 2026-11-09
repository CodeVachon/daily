import type { AuthInfo } from "@modelcontextprotocol/server"

/**
 * Who is calling a tool. Built from the verified OAuth access token on every
 * request — tools should scope all data access to `userId`.
 */
export interface McpContext {
  /** Better Auth user id (token `sub`). */
  userId: string
  /** OAuth client the agent connected with (e.g. Claude Code's client id). */
  clientId: string
  /** Scopes granted to the token. */
  scopes: string[]
}

/** Claims we forward from `requireMcpAuth` into the SDK's AuthInfo.extra. */
export interface McpAuthExtra extends Record<string, unknown> {
  userId: string
}

export function contextFromAuthInfo(
  authInfo: AuthInfo | undefined
): McpContext {
  const userId = (authInfo?.extra as McpAuthExtra | undefined)?.userId
  if (!authInfo || !userId) {
    // requireMcpAuth guarantees a verified token before we get here.
    throw new Error("MCP request reached the server without verified auth")
  }
  return { userId, clientId: authInfo.clientId, scopes: authInfo.scopes }
}
