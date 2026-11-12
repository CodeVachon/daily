import { auth } from "@workspace/auth"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_MAX_AGE,
  resultPath,
  startFlow,
} from "@/lib/google-oauth"
import { integrations } from "@/lib/integrations"

export const dynamic = "force-dynamic"

/**
 * `GET /api/integrations/google/start`: the Connect button. Remembers a
 * state + PKCE verifier in a short-lived cookie and sends the browser to
 * Google's consent page.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")
  const providers = integrations.providers()
  if (!providers.find((p) => p.id === "google")?.configured)
    redirect(
      resultPath({ ok: false, reason: "Google isn't set up on this server." })
    )
  const { cookie, state, codeChallenge } = startFlow(session.user.id)
  ;(await cookies()).set(GOOGLE_OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/integrations/google",
    maxAge: GOOGLE_OAUTH_MAX_AGE,
  })
  redirect(integrations.googleAuthorizeUrl({ state, codeChallenge }))
}
