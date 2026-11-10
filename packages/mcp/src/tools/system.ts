import { z } from "zod"

import { json, type ToolModule } from "./types"

const readOnly = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
}

/** Connectivity + identity tools. */
export const systemTools: ToolModule = (server, ctx) => {
  server.registerTool(
    "ping",
    {
      title: "Ping",
      description:
        "Health check. Returns `pong` and the server time; use it to confirm the MCP connection and auth work.",
      inputSchema: z.object({}),
      outputSchema: z.object({ message: z.literal("pong"), time: z.string() }),
      annotations: readOnly,
    },
    async () =>
      json({ message: "pong" as const, time: new Date().toISOString() })
  )

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "Returns the user this agent acts for, the agent's own name (how its changes are attributed in task history), the token's scopes, and the user's current time zone.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        user: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          image: z.string().nullable(),
          createdAt: z.string(),
        }),
        github: z.object({ id: z.string() }).nullable(),
        client: z.object({
          id: z.string(),
          name: z.string(),
          scopes: z.array(z.string()),
        }),
        timezone: z.string(),
      }),
      annotations: readOnly,
    },
    async () => {
      const profile = await ctx.services.users.getProfile(ctx.userId)
      if (!profile) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "User for this token no longer exists.",
            },
          ],
        }
      }
      const { githubAccountId, createdAt, ...user } = profile
      return json({
        user: { ...user, createdAt: createdAt.toISOString() },
        github: githubAccountId ? { id: githubAccountId } : null,
        client: { id: ctx.clientId, name: ctx.actor.label, scopes: ctx.scopes },
        timezone: ctx.timezone,
      })
    }
  )
}
