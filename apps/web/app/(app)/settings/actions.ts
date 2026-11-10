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
