// Connect with Google (motte #66): the browser round trip between
// /api/integrations/google/start, Google's consent page and /callback.
import { createHash, randomBytes } from "node:crypto"

import { z } from "zod"

/** Holds state + PKCE verifier between start and callback. */
export const GOOGLE_OAUTH_COOKIE = "daily_google_oauth"
/** Long enough to read Google's consent page. */
export const GOOGLE_OAUTH_MAX_AGE = 10 * 60

const SETTINGS_PATH = "/settings/integrations"
const MAX_REASON = 300

const flow = z.object({
  state: z.string().min(1),
  verifier: z.string().min(1),
  userId: z.string().min(1),
})
type Flow = z.infer<typeof flow>

const random = () => randomBytes(32).toString("base64url")

/** A fresh flow for the user: what goes in the cookie, and the challenge. */
export function startFlow(userId: string): {
  cookie: string
  state: string
  codeChallenge: string
} {
  const value: Flow = { state: random(), verifier: random(), userId }
  return {
    cookie: JSON.stringify(value),
    state: value.state,
    codeChallenge: createHash("sha256")
      .update(value.verifier)
      .digest("base64url"),
  }
}

function readFlow(cookie: string | undefined): Flow | null {
  if (!cookie) return null
  try {
    const parsed = flow.safeParse(JSON.parse(cookie))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export type CallbackCheck =
  | { ok: true; userId: string; code: string; verifier: string }
  | { ok: false; reason: string }

const EXPIRED =
  "That Connect link expired or was opened in another browser. Try again."

/**
 * Is Google's redirect the answer to a flow this browser started, for the
 * signed-in user? Anything else is refused before talking to Google.
 */
export function checkCallback({
  params,
  cookie,
  userId,
}: {
  params: URLSearchParams
  cookie: string | undefined
  userId: string | null
}): CallbackCheck {
  if (!userId)
    return { ok: false, reason: "Sign in again, then connect Google." }
  const error = params.get("error")
  if (error === "access_denied")
    return { ok: false, reason: "Google access wasn't granted." }
  if (error) return { ok: false, reason: `Google returned an error: ${error}` }
  const started = readFlow(cookie)
  const code = params.get("code")
  if (
    !started ||
    started.state !== params.get("state") ||
    started.userId !== userId
  )
    return { ok: false, reason: EXPIRED }
  if (!code) return { ok: false, reason: "Google didn't send a code back." }
  return { ok: true, userId, code, verifier: started.verifier }
}

/** Back to Settings > Integrations, saying how it went. */
export function resultPath(
  result: { ok: true } | { ok: false; reason: string }
): string {
  const params = new URLSearchParams(
    result.ok
      ? { google: "connected" }
      : { google: "error", reason: result.reason.slice(0, MAX_REASON) }
  )
  return `${SETTINGS_PATH}?${params}`
}

export type ConnectNotice = { ok: true } | { ok: false; reason: string } | null

/** The notice for the settings page from its search params. */
export function connectNotice(params: {
  google?: string | string[]
  reason?: string | string[]
}): ConnectNotice {
  if (params.google === "connected") return { ok: true }
  if (params.google !== "error") return null
  const reason = typeof params.reason === "string" ? params.reason : ""
  return {
    ok: false,
    reason: reason.slice(0, MAX_REASON) || "Connecting Google failed.",
  }
}
