import { and, asc, eq, isNotNull } from "drizzle-orm"

import { assertCanDelete, type Actor } from "../actor"
import { open, seal, type KeySource } from "../crypto"
import type { Database } from "../database"
import { NotFoundError } from "../errors"
import {
  integrationResource as resourceInput,
  type IntegrationProvider,
  type IntegrationResource,
} from "../integration-inputs"
import { integrationConnection, integrationResource } from "../schema"

/** A live connection as the app shows it: never includes credentials. */
export interface IntegrationConnection {
  provider: IntegrationProvider
  account: string
  config: Record<string, string>
  connectedAt: Date
  /** What's in scope, by key. */
  resources: IntegrationResource[]
}

export interface ConnectInput {
  provider: IntegrationProvider
  account: string
  config?: Record<string, string>
  /** Provider-specific secret(s); stored encrypted. */
  credentials: unknown
}

// Ciphertexts are bound to their owner and provider.
const context = (userId: string, provider: IntegrationProvider) =>
  `${userId}:${provider}`

export function createIntegrationService(db: Database, key: KeySource) {
  const connected = (userId: string) =>
    and(
      eq(integrationConnection.userId, userId),
      isNotNull(integrationConnection.credentialsEnc)
    )

  async function rows(userId: string, provider?: IntegrationProvider) {
    return db.query.integrationConnection.findMany({
      where: provider
        ? and(connected(userId), eq(integrationConnection.provider, provider))
        : connected(userId),
      orderBy: asc(integrationConnection.provider),
      with: { resources: { orderBy: asc(integrationResource.key) } },
    })
  }

  const toConnection = (
    row: Awaited<ReturnType<typeof rows>>[number]
  ): IntegrationConnection => ({
    provider: row.provider,
    account: row.account,
    config: row.config,
    connectedAt: row.connectedAt,
    resources: row.resources.map(({ externalId, key, name, url }) => ({
      externalId,
      key,
      name,
      url,
    })),
  })

  async function get(userId: string, provider: IntegrationProvider) {
    const [row] = await rows(userId, provider)
    return row ? toConnection(row) : null
  }

  async function mustGet(userId: string, provider: IntegrationProvider) {
    const [row] = await rows(userId, provider)
    if (!row) throw new NotFoundError(`${provider} connection`)
    return row
  }

  return {
    /** Connected providers with their selected resources. */
    async list(userId: string): Promise<IntegrationConnection[]> {
      return (await rows(userId)).map(toConnection)
    },

    /** One provider's connection, or null when it isn't connected. */
    get,

    /**
     * Store (or replace) verified credentials. Reconnecting after a
     * disconnect keeps the earlier selection.
     */
    async connect(
      userId: string,
      input: ConnectInput
    ): Promise<IntegrationConnection> {
      const values = {
        account: input.account,
        config: input.config ?? {},
        credentialsEnc: seal(
          key,
          JSON.stringify(input.credentials),
          context(userId, input.provider)
        ),
        connectedAt: new Date(),
        disconnectedAt: null,
      }
      await db
        .insert(integrationConnection)
        .values({ userId, provider: input.provider, ...values })
        .onConflictDoUpdate({
          target: [integrationConnection.userId, integrationConnection.provider],
          set: values,
        })
      return (await get(userId, input.provider))!
    },

    /** The decrypted credentials, for calling the provider. Server-only. */
    async credentials(
      userId: string,
      provider: IntegrationProvider
    ): Promise<unknown> {
      const row = await mustGet(userId, provider)
      return JSON.parse(
        open(key, row.credentialsEnc!, context(userId, provider))
      )
    },

    /** Wipe the credentials. The user's call alone, like any delete. */
    async disconnect(actor: Actor, provider: IntegrationProvider) {
      assertCanDelete(actor, `the ${provider} connection`)
      const row = await mustGet(actor.userId, provider)
      await db
        .update(integrationConnection)
        .set({ credentialsEnc: null, disconnectedAt: new Date() })
        .where(eq(integrationConnection.id, row.id))
    },

    /** Replace what's in scope for a provider with exactly `resources`. */
    async setResources(
      userId: string,
      provider: IntegrationProvider,
      resources: IntegrationResource[]
    ): Promise<IntegrationConnection> {
      const row = await mustGet(userId, provider)
      const unique = new Map(
        resources.map((r) => [r.externalId, resourceInput.parse(r)])
      )
      await db.transaction(async (tx) => {
        await tx
          .delete(integrationResource)
          .where(eq(integrationResource.connectionId, row.id))
        if (unique.size > 0)
          await tx
            .insert(integrationResource)
            .values(
              [...unique.values()].map((r) => ({ connectionId: row.id, ...r }))
            )
      })
      return (await get(userId, provider))!
    },
  }
}
