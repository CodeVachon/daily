// Google Calendar over OAuth (motte #66): an Internal app in the user's
// Workspace. Daily keeps the refresh token (sealed, like other credentials)
// and refreshes access tokens itself.
import { z } from "zod"

import { getJson, ProviderError } from "./http"
import type { AvailableResource, Fetch } from "./types"

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const REVOKE_URL = "https://oauth2.googleapis.com/revoke"
const CALENDAR_API = "https://www.googleapis.com/calendar/v3"

/** Read events and answer invitations; list the user's calendars. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const

/** Refresh this long before Google says the access token expires. */
const EXPIRY_MARGIN_MS = 60_000
const MAX_PAGES = 10

/** The OAuth client from the env file; null when Google isn't set up. */
export interface GoogleConfig {
  clientId: string
  clientSecret: string
  /** `${BETTER_AUTH_URL}/api/integrations/google/callback` */
  redirectUri: string
}

/** What's stored (sealed) for a Google connection. */
export const googleCredentials = z.object({
  refreshToken: z.string().min(1),
  accessToken: z.string().min(1),
  /** ISO time the access token stops working. */
  expiresAt: z.string(),
})
export type GoogleCredentials = z.infer<typeof googleCredentials>

const tokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
})

/** Google's consent link for this client (PKCE, offline, always re-consent). */
export function googleAuthorizeUrl(
  config: GoogleConfig,
  { state, codeChallenge }: { state: string; codeChallenge: string }
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    // A refresh token, every time (prompt=consent), so reconnecting works.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })
  return `${AUTHORIZE_URL}?${params}`
}

/** What Google's invalid_grant means depends on what was being traded. */
const INVALID_GRANT = {
  code: "Google didn't accept the sign-in code (it expires within minutes and works once). Connect again.",
  refresh:
    "Google no longer accepts Daily's access (it was revoked or expired). Reconnect Google in Settings > Integrations.",
}

async function tokenError(
  response: Response,
  invalidGrant: string
): Promise<ProviderError> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string
    error_description?: string
  }
  if (body.error === "invalid_grant") return new ProviderError(invalidGrant)
  return new ProviderError(
    `Google returned ${response.status}${body.error_description ? `: ${body.error_description}` : body.error ? `: ${body.error}` : ""}`
  )
}

async function postToken(
  fetch: Fetch,
  form: Record<string, string>,
  invalidGrant: string
): Promise<z.infer<typeof tokenResponse>> {
  let response: Response
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new ProviderError("Couldn't reach Google. Try again shortly.")
  }
  if (!response.ok) throw await tokenError(response, invalidGrant)
  return tokenResponse.parse(await response.json())
}

const expiry = (now: Date, seconds: number) =>
  new Date(now.getTime() + seconds * 1000).toISOString()

/**
 * Trade the code from Google's redirect for tokens. Both scopes must have
 * been granted (Google lets people untick them).
 */
export async function exchangeGoogleCode(
  config: GoogleConfig,
  fetch: Fetch,
  {
    code,
    codeVerifier,
    now = new Date(),
  }: {
    code: string
    codeVerifier: string
    now?: Date
  }
): Promise<GoogleCredentials> {
  const tokens = await postToken(
    fetch,
    {
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    },
    INVALID_GRANT.code
  )
  const granted = new Set(tokens.scope?.split(" ") ?? [])
  if (GOOGLE_SCOPES.some((s) => !granted.has(s)))
    throw new ProviderError(
      "Daily needs both calendar permissions. Connect again and leave both boxes ticked."
    )
  if (!tokens.refresh_token)
    throw new ProviderError(
      "Google didn't grant offline access. Connect again to retry."
    )
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresAt: expiry(now, tokens.expires_in),
  }
}

/** True while the access token still has a minute or more left. */
export function isFresh(creds: GoogleCredentials, now = new Date()): boolean {
  return new Date(creds.expiresAt).getTime() - EXPIRY_MARGIN_MS > now.getTime()
}

/** A new access token from the refresh token. */
export async function refreshGoogleToken(
  config: GoogleConfig,
  fetch: Fetch,
  creds: GoogleCredentials,
  now = new Date()
): Promise<GoogleCredentials> {
  const tokens = await postToken(
    fetch,
    {
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    },
    INVALID_GRANT.refresh
  )
  return {
    refreshToken: tokens.refresh_token ?? creds.refreshToken,
    accessToken: tokens.access_token,
    expiresAt: expiry(now, tokens.expires_in),
  }
}

/** Best effort: tell Google to drop the grant. Never throws. */
export async function revokeGoogleToken(
  fetch: Fetch,
  creds: GoogleCredentials
): Promise<void> {
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: creds.refreshToken }).toString(),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    // Disconnecting still deletes the tokens from Daily.
  }
}

export interface CalendarListEntry {
  id: string
  summary: string
  summaryOverride?: string
  description?: string
  primary?: boolean
  accessRole: string
}

export const calendarGet = <T>(
  fetch: Fetch,
  accessToken: string,
  path: string
) =>
  getJson<T>(fetch, "Google", `${CALENDAR_API}${path}`, {
    authorization: `Bearer ${accessToken}`,
  })

/** The primary calendar; its id is the user's email (the account). */
export function googlePrimaryCalendar(
  fetch: Fetch,
  accessToken: string
): Promise<CalendarListEntry> {
  return calendarGet<CalendarListEntry>(
    fetch,
    accessToken,
    "/users/me/calendarList/primary"
  )
}

/** A calendar as something to put in scope. Primary first is up to callers. */
export function toCalendarResource(c: CalendarListEntry): AvailableResource {
  const name = c.summaryOverride ?? c.summary
  return {
    externalId: c.id,
    key: name,
    name,
    url: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(c.id)}`,
    description: c.primary ? "Your primary calendar" : (c.description ?? null),
    private: false,
  }
}

/** Every calendar in the user's list, primary first. */
export async function listGoogleCalendars(
  fetch: Fetch,
  accessToken: string
): Promise<AvailableResource[]> {
  const entries: CalendarListEntry[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ maxResults: "250" })
    if (pageToken) params.set("pageToken", pageToken)
    const batch = await calendarGet<{
      items?: CalendarListEntry[]
      nextPageToken?: string
    }>(fetch, accessToken, `/users/me/calendarList?${params}`)
    entries.push(...(batch.items ?? []))
    pageToken = batch.nextPageToken
    if (!pageToken) break
  }
  entries.sort(
    (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary))
  )
  return entries.map(toCalendarResource)
}

/** Where Google sends the user back; register it on the OAuth client. */
const GOOGLE_CALLBACK_PATH = "/api/integrations/google/callback"

/** The OAuth client from env values, or null until both are set. */
export function googleConfig(env: {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  BETTER_AUTH_URL: string
}): GoogleConfig | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: new URL(GOOGLE_CALLBACK_PATH, env.BETTER_AUTH_URL).toString(),
  }
}
