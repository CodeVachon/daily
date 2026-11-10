"use client"

import { oauthProviderClient } from "@better-auth/oauth-provider/client"
import { createAuthClient } from "better-auth/react"

// Same-origin: the web app mounts Better Auth at /api/auth.
// oauthProviderClient forwards the signed `oauth_query` from /sign-in and
// /consent so an MCP client's authorization flow resumes after sign-in.
export const authClient = createAuthClient({
  plugins: [oauthProviderClient()],
})

export const { signIn, signOut, useSession } = authClient
