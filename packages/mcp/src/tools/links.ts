import type { TaskLink } from "@workspace/db/core"
import { z } from "zod"

import { taskRef } from "./inputs"
import { actorOutput, serializeActor } from "./serialize"
import { json, safely, type ToolModule } from "./types"

const linkOutput = z.object({
  id: z.string(),
  provider: z.string(),
  kind: z.string(),
  key: z.string(),
  url: z.string(),
  title: z.string().nullable(),
  state: z.string().nullable(),
  state_category: z.string().nullable(),
  assignee: z.string().nullable(),
  last_synced_at: z.string().nullable(),
  sync_error: z.string().nullable(),
  linked_by: actorOutput,
})

const toOutput = (link: TaskLink) => ({
  id: link.id,
  provider: link.provider,
  kind: link.kind,
  key: link.key,
  url: link.url,
  title: link.title,
  state: link.state,
  state_category: link.stateCategory,
  assignee: link.assignee,
  last_synced_at: link.lastSyncedAt?.toISOString() ?? null,
  sync_error: link.syncError,
  linked_by: serializeActor(link.createdBy),
})

const ref = z
  .string()
  .min(1)
  .describe(
    "A GitHub issue/PR URL or owner/repo#12, or a Jira issue URL or PROJ-42 (uses the connected Jira site)"
  )

/** Links from tasks to GitHub issues/PRs and Jira issues. */
export const linkTools: ToolModule = (server, ctx) => {
  const { links } = ctx.services
  const { integrations } = ctx

  server.registerTool(
    "link_external",
    {
      title: "Link external item",
      description:
        "Link a GitHub issue/PR or Jira issue to a task, e.g. the PR that implements it, and fetch its title and state. Linking the same item again returns the existing link. sync_error says why the state couldn't be fetched (e.g. the repository isn't selected in Settings > Integrations). Only the user can remove links.",
      inputSchema: z.object({ task: taskRef, ref }),
      outputSchema: z.object({ link: linkOutput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ task, ref }) =>
      safely(async () => {
        const link = await links.add(ctx.actor, task, ref)
        return json({
          link: toOutput(await integrations.refreshLink(ctx.userId, link.id)),
        })
      })
  )

  server.registerTool(
    "refresh_links",
    {
      title: "Refresh links",
      description:
        "Fetch the current title and state of every link on a task from GitHub/Jira now. Changes since the last sync are recorded in the task's history as the sync system. Only repositories/projects selected in Settings > Integrations are asked.",
      inputSchema: z.object({ task: taskRef }),
      outputSchema: z.object({ links: z.array(linkOutput) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ task }) =>
      safely(async () => {
        const current = await links.list(ctx.userId, task)
        const refreshed = await Promise.all(
          current.map((l) => integrations.refreshLink(ctx.userId, l.id))
        )
        return json({ links: refreshed.map(toOutput) })
      })
  )

  server.registerTool(
    "list_task_links",
    {
      title: "List task links",
      description:
        "The GitHub issues/PRs and Jira issues linked to a task, with their last synced title and state (null until first synced).",
      inputSchema: z.object({ task: taskRef }),
      outputSchema: z.object({ links: z.array(linkOutput) }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ task }) =>
      safely(async () =>
        json({ links: (await links.list(ctx.userId, task)).map(toOutput) })
      )
  )

  server.registerTool(
    "find_tasks_by_link",
    {
      title: "Find tasks by link",
      description:
        "Which tasks link to a GitHub issue/PR or Jira issue, e.g. to find the task tracking owner/repo#123 before creating a new one.",
      inputSchema: z.object({ ref }),
      outputSchema: z.object({
        tasks: z.array(z.object({ number: z.number(), title: z.string() })),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ ref }) =>
      safely(async () =>
        json({
          tasks: (await links.findTasks(ctx.userId, ref)).map(
            ({ number, title }) => ({ number, title })
          ),
        })
      )
  )
}
