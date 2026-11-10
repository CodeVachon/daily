import {
  INTEGRATION_PROVIDERS,
  ValidationError,
  type IntegrationConnection,
  type IntegrationProvider,
  type Services,
  type SyncResult,
  type TaskLink,
} from "@workspace/db/core"
import { z } from "zod"

import { github } from "./github"
import { ProviderError } from "./http"
import { jira } from "./jira"
import type { AvailableResource, Fetch, Provider, ProviderInfo } from "./types"

const PROVIDERS: Record<IntegrationProvider, Provider> = {
  github: github as Provider,
  jira: jira as Provider,
}

const providerId = z.enum(INTEGRATION_PROVIDERS, {
  error: `Unknown integration; one of: ${INTEGRATION_PROVIDERS.join(", ")}`,
})

/** The serializable part of a provider, for forms and tool output. */
function info({
  id,
  name,
  resourceNoun,
  fields,
  help,
}: Provider): ProviderInfo {
  return { id, name, resourceNoun, fields, help }
}

/**
 * Pick resources by external id or key (case-insensitive). Unknown ones are
 * an error naming them, so a typo never silently narrows the selection.
 */
export function pickResources(
  available: AvailableResource[],
  wanted: string[]
): AvailableResource[] {
  const find = (ref: string) =>
    available.find(
      (r) => r.externalId === ref || r.key.toLowerCase() === ref.toLowerCase()
    )
  const missing = wanted.filter((ref) => !find(ref))
  if (missing.length > 0)
    throw new ValidationError(
      `Not visible with these credentials: ${missing.join(", ")}`
    )
  return wanted.map((ref) => find(ref)!)
}

/** What one sync pass did. */
export interface SyncSummary {
  checked: number
  failed: number
}

export interface IntegrationsOptions {
  services: Pick<Services, "integrations" | "links">
  fetch?: Fetch
}

/**
 * Connecting to external systems: verify credentials, list what they can
 * see, and store the user's selection. Shared by the web app and MCP tools.
 * Data goes through `services.integrations`; providers through `fetch`.
 */
export function createIntegrations({
  services,
  fetch = globalThis.fetch,
}: IntegrationsOptions) {
  const store = services.integrations

  function provider(id: string): Provider {
    return PROVIDERS[providerId.parse(id)]
  }

  async function available(userId: string, id: string) {
    const p = provider(id)
    const creds = p.credentials.parse(await store.credentials(userId, p.id))
    return p.listResources(creds, fetch)
  }

  /**
   * Ask the provider about one link. Never throws for the provider's sake:
   * no connection, out of scope and provider errors become `{ ok: false }`.
   */
  async function fetchState(
    userId: string,
    link: TaskLink
  ): Promise<SyncResult> {
    const p = PROVIDERS[link.provider]
    const connection = await store.get(userId, link.provider)
    if (!connection)
      return {
        ok: false,
        error: `Connect ${p.name} in Settings > Integrations to sync this`,
      }
    const scope = p.scopeOf(link)
    const inScope = connection.resources.some(
      (r) => r.key.toLowerCase() === scope.toLowerCase()
    )
    if (!inScope)
      return {
        ok: false,
        error: `${scope} isn't selected in Settings > Integrations`,
      }
    try {
      const creds = p.credentials.parse(
        await store.credentials(userId, link.provider)
      )
      return { ok: true, state: await p.fetchItem(creds, link, fetch) }
    } catch (error) {
      if (error instanceof ProviderError)
        return { ok: false, error: error.message }
      throw error
    }
  }

  /**
   * Fetch a link's current state now and record it (title, state; later
   * changes go in the task's history). Returns the updated link.
   */
  async function refreshLink(userId: string, linkId: string) {
    const link = await services.links.get(userId, linkId)
    await services.links.recordSync(
      userId,
      linkId,
      await fetchState(userId, link)
    )
    return services.links.get(userId, linkId)
  }

  return {
    refreshLink,

    /**
     * One sync pass: refresh every link that's due (all users). Each
     * provider's links go one at a time, to be gentle on rate limits;
     * providers run side by side.
     */
    async syncDue(
      options: { now?: Date; limit?: number } = {}
    ): Promise<SyncSummary> {
      const due = await services.links.dueForSync(options)
      const groups = new Map<string, typeof due>()
      for (const d of due)
        groups.set(d.provider, [...(groups.get(d.provider) ?? []), d])
      const failures = await Promise.all(
        [...groups.values()].map(async (links) => {
          let failed = 0
          for (const { userId, linkId } of links)
            if ((await refreshLink(userId, linkId)).syncError) failed++
          return failed
        })
      )
      return {
        checked: due.length,
        failed: failures.reduce((a, b) => a + b, 0),
      }
    },

    /** Every provider the user can connect, in display order. */
    providers: (): ProviderInfo[] =>
      INTEGRATION_PROVIDERS.map((id) => info(PROVIDERS[id])),

    /** Check credentials with the provider, then store them encrypted. */
    async connect(
      userId: string,
      id: string,
      input: unknown
    ): Promise<IntegrationConnection> {
      const p = provider(id)
      const creds = p.credentials.parse(input)
      const verified = await p.verify(creds, fetch)
      return store.connect(userId, {
        provider: p.id,
        ...verified,
        credentials: creds,
      })
    },

    /** Repositories/projects the stored credentials can see. */
    available,

    /** Make exactly `refs` (external ids or keys) the selection. */
    async select(
      userId: string,
      id: string,
      refs: string[]
    ): Promise<IntegrationConnection> {
      const picked = pickResources(await available(userId, id), refs)
      return store.setResources(
        userId,
        provider(id).id,
        picked.map(({ externalId, key, name, url }) => ({
          externalId,
          key,
          name,
          url,
        }))
      )
    },
  }
}

export type Integrations = ReturnType<typeof createIntegrations>
