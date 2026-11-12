import { eq } from "drizzle-orm"

import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  toAppearance,
  type Appearance,
  type AppearancePatch,
} from "../appearance"
import type { Database } from "../database"
import { ValidationError } from "../errors"
import { userSettings } from "../schema"
import {
  DEFAULT_WEEK_START,
  isValidTimeZone,
  isWeekStart,
  type WeekStart,
} from "../time"

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

  async function getAppearance(userId: string): Promise<Appearance> {
    const row = await current(userId)
    return row ? toAppearance(row) : DEFAULT_APPEARANCE
  }

  async function getWeekStart(userId: string): Promise<WeekStart> {
    const value = (await current(userId))?.weekStartsOn
    return isWeekStart(value) ? value : DEFAULT_WEEK_START
  }

  return {
    /** The day weeks start on (calendar weeks, "due this week"). */
    getWeekStart,

    /** Start weeks on Sunday (0), Monday (1) or Saturday (6). */
    async updateWeekStart(
      userId: string,
      weekStartsOn: number
    ): Promise<WeekStart> {
      if (!isWeekStart(weekStartsOn))
        throw new ValidationError(
          "Weeks can start on Sunday (0), Monday (1) or Saturday (6)"
        )
      await db
        .insert(userSettings)
        .values({ userId, weekStartsOn })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { weekStartsOn },
        })
      return weekStartsOn
    },

    /** The base colour, theme and chart palette the app is drawn in. */
    getAppearance,

    /** Change any of base colour, theme and chart palette; returns the result. */
    async updateAppearance(
      userId: string,
      patch: AppearancePatch
    ): Promise<Appearance> {
      const next = applyAppearance(await getAppearance(userId), patch)
      await db
        .insert(userSettings)
        .values({ userId, ...next })
        .onConflictDoUpdate({ target: userSettings.userId, set: next })
      return next
    },

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
