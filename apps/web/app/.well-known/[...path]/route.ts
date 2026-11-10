import { auth } from "@workspace/auth"

// OAuth discovery for MCP clients, served at the site root:
//   /.well-known/oauth-protected-resource[/api/mcp]     (RFC 9728)
//   /.well-known/oauth-authorization-server[/api/auth]  (RFC 8414)
//   /.well-known/openid-configuration[/api/auth]
// Better Auth's handler answers these paths directly.
export const GET = (request: Request) => auth.handler(request)
