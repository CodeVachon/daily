import { requireMcpAuth } from "@better-auth/mcp"
import { auth, MCP_RESOURCE } from "@workspace/auth"
import { services } from "@workspace/db"

import { authInfoFromClaims, bearerToken } from "./context"
import { ENV } from "./env"
import { createMcpRequestHandler } from "./index"

const handler = createMcpRequestHandler(services, ENV.APP_VERSION)

/**
 * `POST /api/mcp`. Verifies the bearer token (JWKS, issuer, audience = this
 * resource); unauthenticated requests get a 401 + RFC 9728 challenge so MCP
 * clients start the OAuth flow.
 */
export const POST = requireMcpAuth(
  auth,
  (request, claims) =>
    handler.fetch(request, {
      authInfo: authInfoFromClaims(
        claims,
        bearerToken(request.headers.get("authorization")),
        MCP_RESOURCE
      ),
    }),
  { resource: MCP_RESOURCE }
)
