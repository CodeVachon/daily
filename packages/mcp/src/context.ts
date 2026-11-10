import type { AuthInfo } from "@modelcontextprotocol/server"
import type { Services } from "@workspace/db"

/**
 * Who is calling a tool, and the data services to serve them with. Built from
 * the verified OAuth access token on every request — tools must scope all
 * data access to `userId`, and must only touch data through `services`.
 */
export interface McpContext {
  /** Better Auth user id (token `sub`). */
  userId: string
  /** OAuth client the agent connected with (e.g. Claude Code's client id). */
  clientId: string
  /** Scopes granted to the token. */
  scopes: string[]
  services: Services
}

/** Verified JWT access-token claims, as `requireMcpAuth` hands them over. */
export interface AccessTokenClaims {
  sub?: unknown
  scope?: unknown
  azp?: unknown
  client_id?: unknown
  exp?: unknown
}

const asString = (value: unknown) => (typeof value === "string" ? value : "")

/** Maps verified token claims to the MCP SDK's AuthInfo for the handler. */
export function authInfoFromClaims(
  claims: AccessTokenClaims,
  token: string,
  resource: string
): AuthInfo {
  return {
    token,
    clientId: asString(claims.azp) || asString(claims.client_id),
    scopes: asString(claims.scope).split(" ").filter(Boolean),
    expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    resource: new URL(resource),
    extra: { userId: asString(claims.sub) },
  }
}

/** Bearer token from an Authorization header ("" when absent). */
export function bearerToken(header: string | null): string {
  return header?.replace(/^\S+\s+/, "") ?? ""
}

export function contextFromAuthInfo(
  authInfo: AuthInfo | undefined,
  services: Services
): McpContext {
  const userId = asString(authInfo?.extra?.userId)
  if (!authInfo || !userId) {
    // requireMcpAuth guarantees a verified token before we get here.
    throw new Error("MCP request reached the server without verified auth")
  }
  return {
    userId,
    clientId: authInfo.clientId,
    scopes: authInfo.scopes,
    services,
  }
}
