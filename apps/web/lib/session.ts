import "server-only"

import { auth } from "@workspace/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

/** Current session or null. Deduped per request. */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

/** Use in server components/actions that require a signed-in user. */
export async function requireSession() {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  return session
}
