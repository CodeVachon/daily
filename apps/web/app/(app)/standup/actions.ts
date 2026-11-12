"use server"

import { services } from "@workspace/db"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

/** "I posted it": the next draft starts from now. */
export async function recordStandupAction(body: string) {
  return runAsUser(async (actor) => {
    const post = await services.standup.record(actor, { body })
    refresh()
    return post.id
  })
}
