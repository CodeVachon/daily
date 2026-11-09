import { requireMcpAuth } from "@better-auth/mcp"
import { createMcpHandler } from "@modelcontextprotocol/server"
import { auth, MCP_RESOURCE } from "@workspace/auth"

import { contextFromAuthInfo, type McpAuthExtra } from "./context"
import { createMcpServer } from "./index"

// One fresh server per request, built for the caller. `legacy: "stateless"`
// also answers 2025-era clients (no sessions), alongside MCP 2026-07-28.
const handler = createMcpHandler(
  ({ authInfo }) => createMcpServer(contextFromAuthInfo(authInfo)),
  { legacy: "stateless" }
)

/**
 * `POST /api/mcp`. Verifies the bearer token (JWKS, issuer, audience = this
 * resource); unauthenticated requests get a 401 + RFC 9728 challenge so MCP
 * clients start the OAuth flow.
 */
export const POST = requireMcpAuth(
  auth,
  (request, claims) => {
    const scope = typeof claims.scope === "string" ? claims.scope : ""
    const clientId = String(claims.azp ?? claims.client_id ?? "")
    const extra: McpAuthExtra = { userId: String(claims.sub ?? "") }
    return handler.fetch(request, {
      authInfo: {
        token:
          request.headers.get("authorization")?.replace(/^\S+\s+/, "") ?? "",
        clientId,
        scopes: scope.split(" ").filter(Boolean),
        expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
        resource: new URL(MCP_RESOURCE),
        extra,
      },
    })
  },
  { resource: MCP_RESOURCE }
)
