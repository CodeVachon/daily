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

/** Set (or clear, with "") my Slack member ID for {{mention}}. */
export async function updateSlackMemberIdAction(value: string) {
  return runAsUser(async (actor) => {
    const id = await services.settings.updateSlackMemberId(actor.userId, value)
    refresh()
    return id
  })
}

/** Save a message template (checked first). */
export async function updateTemplateAction(key: string, body: string) {
  return runAsUser(async (actor) => {
    const template = await services.templates.update(actor, key, body)
    refresh()
    return template.body
  })
}

/** The standup template body rendered with today's standup (not saved). */
export async function previewTemplateAction(body: string) {
  return runAsUser((actor) => services.standup.preview(actor.userId, body))
}
