"use server"

import { services } from "@workspace/db"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

/** The user has seen this task as it is now (opening it, or "Mark read"). */
export async function markReadAction(taskId: string) {
  return runAsUser(async (actor) => {
    await services.inbox.markRead(actor.userId, taskId)
    refresh()
    return null
  })
}

/** Everything so far counts as seen. */
export async function markAllReadAction() {
  return runAsUser(async (actor) => {
    await services.inbox.markAllRead(actor.userId)
    refresh()
    return null
  })
}
