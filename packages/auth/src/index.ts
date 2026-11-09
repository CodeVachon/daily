import { db } from "@workspace/db"
import * as schema from "@workspace/db/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { github } from "better-auth/social-providers"

import { isAllowedGithubLogin, parseAllowlist } from "./allowlist"
import { ENV } from "./env"

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
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // GitHub is the only way in — no email/password.
  emailAndPassword: { enabled: false },
  socialProviders: {
    github: {
      ...githubCredentials,
      // Runs on every OAuth callback (sign-up *and* sign-in). Returning null
      // makes Better Auth abort before any user/account/session is written and
      // redirect to the error page with `?error=unable_to_get_user_info`.
      async getUserInfo(token) {
        const info = await stockGithub.getUserInfo(token)
        const login = (info?.data as { login?: string } | undefined)?.login
        if (!info || !isAllowedGithubLogin(allowedGithubUsers, login)) {
          console.warn(
            `[auth] rejected GitHub sign-in for "${login ?? "unknown"}" (not in AUTH_GITHUB_ALLOWED_USERS)`
          )
          return null
        }
        return info
      },
    },
  },
  account: {
    accountLinking: { enabled: false },
  },
  plugins: [nextCookies()], // must stay last
})

export type Session = typeof auth.$Infer.Session
