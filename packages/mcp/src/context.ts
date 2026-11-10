import type { AuthInfo } from "@modelcontextprotocol/server"
import type { Actor, Services } from "@workspace/db/core"

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
  /** The agent making changes, named after its OAuth client (e.g. "Claude Code"). */
  actor: Actor
  /** The user's current IANA zone, for "today" and for showing times. */
  timezone: string
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

/**
 * The tool context for a verified request: who is calling (as an agent
 * actor), which user they act for, and that user's current time zone.
 */
export async function contextFromAuthInfo(
  authInfo: AuthInfo | undefined,
  services: Services
): Promise<McpContext> {
  const userId = asString(authInfo?.extra?.userId)
  if (!authInfo || !userId) {
    // requireMcpAuth guarantees a verified token before we get here.
    throw new Error("MCP request reached the server without verified auth")
  }
  const [actor, timezone] = await Promise.all([
    services.actors.forAgent(userId, authInfo.clientId),
    services.settings.getTimezone(userId),
  ])
  return {
    userId,
    clientId: authInfo.clientId,
    scopes: authInfo.scopes,
    actor,
    timezone,
    services,
  }
}
