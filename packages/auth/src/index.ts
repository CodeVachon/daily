import { cimd } from "@better-auth/cimd"
import { fetchClientMetadataResource } from "@better-auth/cimd/node"
import { mcp } from "@better-auth/mcp"
import { authDatabaseAdapter } from "@workspace/db"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { jwt } from "better-auth/plugins"
import { github } from "better-auth/social-providers"

import { gateGithubUserInfo, parseAllowlist } from "./allowlist"
import { ENV } from "./env"

/** Canonical URL of the MCP endpoint; access tokens are audience-bound to it. */
export const MCP_RESOURCE = new URL("/api/mcp", ENV.BETTER_AUTH_URL).toString()

const allowedGithubUsers = parseAllowlist(ENV.AUTH_GITHUB_ALLOWED_USERS)

const githubCredentials = {
  clientId: ENV.GITHUB_CLIENT_ID,
  clientSecret: ENV.GITHUB_CLIENT_SECRET,
}

// Better Auth's stock GitHub provider; we wrap its getUserInfo to gate access.
const stockGithub = github(githubCredentials)

export const auth = betterAuth({
  appName: "daily",
  baseURL: ENV.BETTER_AUTH_URL,
  secret: ENV.BETTER_AUTH_SECRET,
  database: authDatabaseAdapter,
  // GitHub is the only way in — no email/password.
  emailAndPassword: { enabled: false },
  socialProviders: {
    github: {
      ...githubCredentials,
      // Runs on every OAuth callback (sign-up *and* sign-in). Rejected logins
      // abort before any user/account/session is written and land on
      // /sign-in?error=unable_to_get_user_info.
      getUserInfo: gateGithubUserInfo(
        stockGithub.getUserInfo,
        allowedGithubUsers,
        (login) =>
          console.warn(
            `[auth] rejected GitHub sign-in for "${login ?? "unknown"}" (not in AUTH_GITHUB_ALLOWED_USERS)`
          )
      ),
    },
  },
  account: {
    accountLinking: { enabled: false },
  },
  plugins: [
    // Signs MCP access tokens; /api/mcp verifies them against /api/auth/jwks.
    jwt(),
    // Makes this app the OAuth 2.1 authorization server for MCP clients
    // (Claude Code, Claude Desktop, ...). They sign in through the same
    // GitHub-gated /sign-in page, so the allowlist applies to agents too.
    mcp({
      resource: MCP_RESOURCE,
      loginPage: "/sign-in",
      consentPage: "/consent",
      // Older MCP clients register via Dynamic Client Registration (public
      // clients, so unauthenticated). Registering grants nothing by itself:
      // every token still requires an allowlisted GitHub sign-in + consent.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
    }),
    // MCP 2026-07-28 clients identify themselves with a Client ID Metadata
    // Document URL instead of registering.
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    nextCookies(), // must stay last
  ],
})

export type Session = typeof auth.$Infer.Session
