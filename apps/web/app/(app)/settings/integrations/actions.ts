"use server"

import { services } from "@workspace/db"
import { INTEGRATION_PROVIDERS } from "@workspace/db/core"
import { refresh } from "next/cache"
import { z } from "zod"

import { runAsUser } from "@/lib/actions"
import { integrations } from "@/lib/integrations"

const provider = z.enum(INTEGRATION_PROVIDERS)

/** Check the credentials with the provider, then store them encrypted. */
export async function connectIntegrationAction(
  id: string,
  credentials: Record<string, string>
) {
  return runAsUser(async (actor) => {
    const connection = await integrations.connect(actor.userId, id, credentials)
    refresh()
    return { account: connection.account }
  })
}

/** Make exactly these repositories/projects (external ids) the scope. */
export async function selectIntegrationResourcesAction(
  id: string,
  externalIds: string[]
) {
  return runAsUser(async (actor) => {
    const connection = await integrations.select(
      actor.userId,
      id,
      z.array(z.string()).parse(externalIds)
    )
    refresh()
    return { count: connection.resources.length }
  })
}

/** Forget the credentials; the selection is kept for a later reconnect. */
export async function disconnectIntegrationAction(id: string) {
  return runAsUser(async (actor) => {
    await services.integrations.disconnect(actor, provider.parse(id))
    refresh()
    return null
  })
}
