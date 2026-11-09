import { db } from "@workspace/db"
import { z } from "zod"

import { json, type ToolModule } from "./types"

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
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () =>
      json({ message: "pong" as const, time: new Date().toISOString() })
  )

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "Returns the signed-in user this agent is acting as, plus the OAuth client and scopes of the current token.",
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
        client: z.object({ id: z.string(), scopes: z.array(z.string()) }),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const user = await db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.userId),
        with: { accounts: { columns: { providerId: true, accountId: true } } },
      })
      if (!user) {
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
      const github = user.accounts.find((a) => a.providerId === "github")
      return json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt.toISOString(),
        },
        github: github ? { id: github.accountId } : null,
        client: { id: ctx.clientId, scopes: ctx.scopes },
      })
    }
  )
}
