import type { TimezoneUpdate } from "@workspace/db"
import { timeZoneLabel } from "@workspace/db/time"

/**
 * Text for the "you changed time zones" notice, or null when there is nothing
 * to say (first report, no change, signed out).
 */
export function timezoneNotice(
  update: TimezoneUpdate | null,
  now = new Date()
): string | null {
  if (!update?.changed || update.previous === null) return null
  return `Times now shown in ${timeZoneLabel(update.timezone, now)}`
}
