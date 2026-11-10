import { describeEvent, type TaskEvent } from "@workspace/db/core"
import { z } from "zod"

import type { McpContext } from "../context"
import { taskRef } from "./inputs"
import { actorOutput, serializeActor } from "./serialize"
import { json, safely, type ToolModule } from "./types"

const readOnly = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
}

const eventOutput = z.object({
  seq: z.number(),
  at: z.string(),
  task: z.object({ ref: z.string(), title: z.string() }).nullable(),
  actor: actorOutput,
  type: z.string(),
  summary: z.string(),
  details: z.record(z.string(), z.unknown()),
})

/** Task refs for the events' tasks (null when a task was deleted). */
async function taskNames(ctx: McpContext, events: TaskEvent[]) {
  const names = new Map<string, { ref: string; title: string } | null>()
  for (const id of new Set(events.map((e) => e.taskId))) {
    try {
      const task = await ctx.services.tasks.get(ctx.userId, id)
      names.set(id, { ref: `#${task.number}`, title: task.title })
    } catch {
      names.set(id, null)
    }
  }
  return names
}

async function serializeEvents(ctx: McpContext, events: TaskEvent[]) {
  const names = await taskNames(ctx, events)
  return events.map((event) => {
    const { type, ...details } = event.payload
    return {
      seq: event.seq,
      at: event.at.toISOString(),
      task: names.get(event.taskId) ?? null,
      actor: serializeActor(event.actor),
      type,
      summary: `${event.actor.label} ${describeEvent(event.payload)}`,
      details,
    }
  })
}

/** History: what happened to a task, and what changed since an agent last looked. */
export const activityTools: ToolModule = (server, ctx) => {
  server.registerTool(
    "get_activity",
    {
      title: "Get task activity",
      description:
        "A task's history, newest first: who (the user, an agent, or sync) changed what, old → new.",
      inputSchema: z.object({
        task: taskRef,
        limit: z.number().int().min(1).max(200).optional(),
      }),
      outputSchema: z.object({ events: z.array(eventOutput) }),
      annotations: readOnly,
    },
    async ({ task, limit = 50 }) =>
      safely(async () => {
        const id = await ctx.services.tasks.resolveId(ctx.userId, task)
        return json({
          events: await serializeEvents(
            ctx,
            await ctx.services.activity.forTask(ctx.userId, id, limit)
          ),
        })
      })
  )

  server.registerTool(
    "get_updates_since",
    {
      title: "Get updates since",
      description:
        "Catch up on changes across all tasks, oldest first. Pass the cursor from your previous call to get only newer changes. By default your own changes are left out, so you see what the user (or other agents) did.",
      inputSchema: z.object({
        cursor: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("The cursor returned by your last call"),
        include_mine: z
          .boolean()
          .optional()
          .describe("Also include changes you made (default false)"),
        actors: z
          .array(z.enum(["user", "agent", "system"]))
          .optional()
          .describe("Only these kinds of actor"),
        limit: z.number().int().min(1).max(200).optional(),
      }),
      outputSchema: z.object({
        events: z.array(eventOutput),
        cursor: z.number().nullable(),
        hasMore: z.boolean(),
      }),
      annotations: readOnly,
    },
    async ({ cursor, include_mine = false, actors, limit = 50 }) =>
      safely(async () => {
        const page = await ctx.services.activity.since(ctx.userId, {
          after: cursor,
          actorTypes: actors,
          excludeClientId: include_mine ? undefined : ctx.clientId,
          limit,
        })
        return json({
          events: await serializeEvents(ctx, page.events),
          cursor: page.events.at(-1)?.seq ?? cursor ?? null,
          hasMore: page.nextCursor !== null,
        })
      })
  )

  server.registerTool(
    "list_unread_updates",
    {
      title: "List unread updates",
      description:
        "What the user hasn't seen yet: tasks that agents or the sync worker changed since the user last opened them (their Updates inbox), newest first, with the latest unread changes. Use it to brief the user. Read-only: only the user marks things read, by opening the task.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional(),
      }),
      outputSchema: z.object({
        tasks: z.array(
          z.object({
            ref: z.string(),
            title: z.string(),
            unread: z.number(),
            changes: z.array(eventOutput),
          })
        ),
      }),
      annotations: readOnly,
    },
    async ({ limit = 20 }) => {
      const items = await ctx.services.inbox.list(ctx.userId, { limit })
      return json({
        tasks: await Promise.all(
          items.map(async (item) => ({
            ref: `#${item.task.number}`,
            title: item.task.title,
            unread: item.unread,
            changes: await serializeEvents(ctx, item.events),
          }))
        ),
      })
    }
  )
}
