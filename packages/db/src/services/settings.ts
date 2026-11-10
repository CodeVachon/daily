import { eq } from "drizzle-orm"

import type { Database } from "../database"
import { userSettings } from "../schema"
import { isValidTimeZone } from "../time"

const DEFAULT_TIMEZONE = "UTC"

export interface TimezoneUpdate {
  timezone: string
  /** Zone before this report; null on the first report. */
  previous: string | null
  changed: boolean
}

export function createSettingsService(db: Database) {
  async function current(userId: string) {
    return db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    })
  }

  return {
    /** The user's current IANA zone ("UTC" until their browser reports one). */
    async getTimezone(userId: string): Promise<string> {
      return (await current(userId))?.timezone ?? DEFAULT_TIMEZONE
    },

    /**
     * Record the zone the user's browser is in now. Called on every page load
     * and focus; only writes when it actually changed (travel).
     */
    async reportTimezone(
      userId: string,
      timezone: string
    ): Promise<TimezoneUpdate> {
      if (!isValidTimeZone(timezone))
        throw new RangeError(`Unknown time zone: ${timezone}`)
      const existing = await current(userId)
      const previous = existing?.timezone ?? null
      if (previous === timezone) return { timezone, previous, changed: false }

      const now = new Date()
      await db
        .insert(userSettings)
        .values({ userId, timezone, timezoneChangedAt: now })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { timezone, timezoneChangedAt: now },
        })
      return { timezone, previous, changed: true }
    },
  }
}
