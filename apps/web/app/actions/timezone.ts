"use server"

import { services, type TimezoneUpdate } from "@workspace/db"

import { getSession } from "@/lib/session"

/**
 * Called by <TimezoneSync> with the browser's current IANA zone. Returns null
 * when nobody is signed in (e.g. on /sign-in).
 */
export async function reportTimezone(
  timezone: string
): Promise<TimezoneUpdate | null> {
  const session = await getSession()
  if (!session) return null
  return services.settings.reportTimezone(session.user.id, timezone)
}
