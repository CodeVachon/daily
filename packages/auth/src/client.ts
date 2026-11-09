"use client"

import { createAuthClient } from "better-auth/react"

// Same-origin: the web app mounts Better Auth at /api/auth.
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
