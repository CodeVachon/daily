"use server"

import { services } from "@workspace/db"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"
import { integrations } from "@/lib/integrations"

/**
 * Link a GitHub issue/PR or Jira issue (URL or shorthand) to a task, then
 * fetch its title and state straight away.
 */
export async function addLinkAction(taskId: string, input: string) {
  return runAsUser(async (actor) => {
    const link = await services.links.add(actor, taskId, input)
    await integrations.refreshLink(actor.userId, link.id)
    refresh()
    return { key: link.key }
  })
}

/** Fetch the current state of every link on a task. */
export async function refreshLinksAction(taskId: string) {
  return runAsUser(async (actor) => {
    const links = await services.links.list(actor.userId, taskId)
    await Promise.all(
      links.map((link) => integrations.refreshLink(actor.userId, link.id))
    )
    refresh()
    return null
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
