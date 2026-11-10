import { INTEGRATION_PROVIDERS } from "@workspace/db/core"
import { z } from "zod"

import { json, safely, type ToolModule } from "./types"

const provider = z
  .enum(INTEGRATION_PROVIDERS)
  .describe(`Which integration: ${INTEGRATION_PROVIDERS.join(", ")}`)

const resource = z.object({
  key: z.string(),
  name: z.string(),
  url: z.string(),
})

/**
 * External systems (GitHub, Jira). Agents can see and change what's in scope,
 * but never credentials: connecting and disconnecting is the user's, in
 * Settings > Integrations.
 */
export const integrationTools: ToolModule = (server, ctx) => {
  const { integrations } = ctx

  server.registerTool(
    "list_integrations",
    {
      title: "List integrations",
      description:
        "The external systems Daily can connect to (GitHub, Jira), whether each is connected and as whom, and which repositories/projects are in scope. Only in-scope ones are ever looked at. Credentials are entered by the user in Settings > Integrations; you cannot see or set them.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        integrations: z.array(
          z.object({
            provider: z.string(),
            name: z.string(),
            resource_noun: z.string(),
            connected: z.boolean(),
            account: z.string().nullable(),
            details: z.record(z.string(), z.string()),
            in_scope: z.array(resource),
          })
        ),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const connections = await ctx.services.integrations.list(ctx.userId)
      return json({
        integrations: integrations.providers().map((p) => {
          const c = connections.find((x) => x.provider === p.id)
          return {
            provider: p.id,
            name: p.name,
            resource_noun: p.resourceNoun.many,
            connected: Boolean(c),
            account: c?.account ?? null,
            details: c?.config ?? {},
            in_scope: (c?.resources ?? []).map(({ key, name, url }) => ({
              key,
              name,
              url,
            })),
          }
        }),
      })
    }
  )

  server.registerTool(
    "list_integration_resources",
    {
      title: "List integration resources",
      description:
        "Every repository (GitHub) or project (Jira) the connected credentials can see, asked of the provider now, with in_scope marking the ones the user selected. Use the keys with set_integration_scope. Fails if the integration isn't connected.",
      inputSchema: z.object({ provider }),
      outputSchema: z.object({
        resources: z.array(
          resource.extend({
            description: z.string().nullable(),
            private: z.boolean(),
            in_scope: z.boolean(),
          })
        ),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ provider }) =>
      safely(async () => {
        const [available, connection] = await Promise.all([
          integrations.available(ctx.userId, provider),
          ctx.services.integrations.get(ctx.userId, provider),
        ])
        const selected = new Set(
          connection?.resources.map((r) => r.externalId) ?? []
        )
        return json({
          resources: available.map((r) => ({
            key: r.key,
            name: r.name,
            url: r.url,
            description: r.description,
            private: r.private,
            in_scope: selected.has(r.externalId),
          })),
        })
      })
  )

  server.registerTool(
    "set_integration_scope",
    {
      title: "Set integration scope",
      description:
        'Replace which repositories (GitHub "owner/repo") or projects (Jira "PROJ") are in scope with exactly `keys`; anything left out stops being looked at. To add one, pass the current in_scope keys plus it. Keys must be visible to the credentials (list_integration_resources); unknown keys are an error and nothing changes.',
      inputSchema: z.object({
        provider,
        keys: z.array(z.string().min(1)).describe("The full new scope"),
      }),
      outputSchema: z.object({ in_scope: z.array(resource) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ provider, keys }) =>
      safely(async () => {
        const connection = await integrations.select(ctx.userId, provider, keys)
        return json({
          in_scope: connection.resources.map(({ key, name, url }) => ({
            key,
            name,
            url,
          })),
        })
      })
  )
}
