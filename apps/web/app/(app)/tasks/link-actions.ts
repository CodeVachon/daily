"use server"

import { services } from "@workspace/db"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

/** Link a GitHub issue/PR or Jira issue (URL or shorthand) to a task. */
export async function addLinkAction(taskId: string, input: string) {
  return runAsUser(async (actor) => {
    const link = await services.links.add(actor, taskId, input)
    refresh()
    return { key: link.key }
  })
}

/** Remove a link (the user only). */
export async function removeLinkAction(linkId: string) {
  return runAsUser(async (actor) => {
    await services.links.remove(actor, linkId)
    refresh()
    return null
  })
}
