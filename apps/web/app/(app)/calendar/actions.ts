"use server"

import { RSVP_RESPONSES } from "@workspace/db/core"
import { refresh } from "next/cache"
import { z } from "zod"

import { runAsUser } from "@/lib/actions"
import { integrations } from "@/lib/integrations"

const input = z.object({
  eventId: z.string().min(1),
  response: z.enum(RSVP_RESPONSES),
  scope: z.enum(["event", "series"]),
})

/**
 * Answer an invitation (Accept / Maybe / Decline). Google tells the
 * organizer; the answer shows at once. Users only: agents have no tool.
 */
export async function rsvpAction(
  eventId: string,
  response: string,
  scope: string
) {
  return runAsUser(async (actor) => {
    const args = input.parse({ eventId, response, scope })
    const changed = await integrations.rsvp(
      actor.userId,
      args.eventId,
      args.response,
      args.scope
    )
    refresh()
    return { changed }
  })
}
