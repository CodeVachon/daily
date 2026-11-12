"use server"

import { services } from "@workspace/db"
import { appearancePatch, type AppearancePatch } from "@workspace/db/core"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

/** Change the app's base colour, theme or chart palette for this user. */
export async function updateAppearanceAction(patch: AppearancePatch) {
  return runAsUser(async (actor) => {
    const appearance = await services.settings.updateAppearance(
      actor.userId,
      appearancePatch.parse(patch)
    )
    refresh()
    return appearance
  })
}

/** Start this user's weeks on Sunday (0), Monday (1) or Saturday (6). */
export async function updateWeekStartAction(weekStartsOn: number) {
  return runAsUser(async (actor) => {
    const day = await services.settings.updateWeekStart(
      actor.userId,
      weekStartsOn
    )
    refresh()
    return day
  })
}
