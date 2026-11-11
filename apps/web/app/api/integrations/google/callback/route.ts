import { auth } from "@workspace/auth"
import { ValidationError } from "@workspace/db/core"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import {
  checkCallback,
  GOOGLE_OAUTH_COOKIE,
  resultPath,
} from "@/lib/google-oauth"
import { integrations } from "@/lib/integrations"

export const dynamic = "force-dynamic"

/** Store the tokens; Google's refusals become a message, not a crash. */
async function connect(userId: string, code: string, verifier: string) {
  try {
    await integrations.connectGoogle(userId, code, verifier)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof ValidationError)
      return { ok: false as const, reason: error.message }
    throw error
  }
}

/**
 * `GET /api/integrations/google/callback`: where Google sends the browser
 * back. Checks it answers this browser's flow, trades the code for tokens
 * and returns to Settings > Integrations.
 */
export async function GET(request: NextRequest) {
  const jar = await cookies()
  const session = await auth.api.getSession({ headers: await headers() })
  const check = checkCallback({
    params: request.nextUrl.searchParams,
    cookie: jar.get(GOOGLE_OAUTH_COOKIE)?.value,
    userId: session?.user.id ?? null,
  })
  jar.delete({ name: GOOGLE_OAUTH_COOKIE, path: "/api/integrations/google" })
  redirect(
    resultPath(
      check.ok ? await connect(check.userId, check.code, check.verifier) : check
    )
  )
}
