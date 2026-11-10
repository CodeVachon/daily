import { COLORS } from "@workspace/db/core"
import { z } from "zod"

import { taskRef } from "./inputs"
import { ensureLabelIds, resolveProjectId } from "./resolve"
import { serializeTaskDetail, taskDetailOutput } from "./serialize"
import { json, safely, type ToolModule } from "./types"

const readOnly = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
}
const write = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
}

const color = z
  .enum(COLORS)
  .nullable()
  .describe(`One of: ${COLORS.join(", ")}`)
const projectOutput = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  archived: z.boolean(),
})
const labelOutput = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
})

/** Projects and labels. Agents can create, rename, recolour and archive; not delete. */
export const catalogTools: ToolModule = (server, ctx) => {
  const { projects, labels, tasks } = ctx.services

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "The user's projects (archived ones only when asked).",
      inputSchema: z.object({ include_archived: z.boolean().optional() }),
      outputSchema: z.object({ projects: z.array(projectOutput) }),
      annotations: readOnly,
    },
    async ({ include_archived = false }) =>
      json({
        projects: await projects.list(ctx.userId, {
          includeArchived: include_archived,
        }),
      })
  )

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a project to group tasks.",
      inputSchema: z.object({ name: z.string(), color: color.optional() }),
      outputSchema: z.object({ project: projectOutput }),
      annotations: write,
    },
    async (input) =>
      safely(async () =>
        json({ project: await projects.create(ctx.actor, input) })
      )
  )

  server.registerTool(
    "update_project",
    {
      title: "Update project",
      description:
        "Rename, recolour or archive/unarchive a project (by name or id).",
      inputSchema: z.object({
        project: z.string().describe("Project name or id"),
        name: z.string().optional(),
        color: color.optional(),
        archived: z.boolean().optional(),
      }),
      outputSchema: z.object({ project: projectOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ project, ...changes }) =>
      safely(async () => {
        const id = (await resolveProjectId(ctx, project))!
        return json({ project: await projects.update(ctx.actor, id, changes) })
      })
  )

  server.registerTool(
    "list_labels",
    {
      title: "List labels",
      description: "The user's labels.",
      inputSchema: z.object({}),
      outputSchema: z.object({ labels: z.array(labelOutput) }),
      annotations: readOnly,
    },
    async () => json({ labels: await labels.list(ctx.userId) })
  )

  server.registerTool(
    "create_label",
    {
      title: "Create label",
      description: "Create a label (names are unique, case-insensitive).",
      inputSchema: z.object({ name: z.string(), color: color.optional() }),
      outputSchema: z.object({ label: labelOutput }),
      annotations: write,
    },
    async (input) =>
      safely(async () => json({ label: await labels.create(ctx.actor, input) }))
  )

  server.registerTool(
    "update_label",
    {
      title: "Update label",
      description: "Rename or recolour a label (by current name or id).",
      inputSchema: z.object({
        label: z.string().describe("Label name or id"),
        name: z.string().optional(),
        color: color.optional(),
      }),
      outputSchema: z.object({ label: labelOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ label, ...changes }) =>
      safely(async () => {
        const all = await labels.list(ctx.userId)
        const match = all.find(
          (l) => l.id === label || l.name.toLowerCase() === label.toLowerCase()
        )
        // Unknown names fall through to the service, which reports "Label … not found".
        return json({
          label: await labels.update(ctx.actor, match?.id ?? label, changes),
        })
      })
  )

  server.registerTool(
    "set_task_labels",
    {
      title: "Set task labels",
      description:
        "Replace a task's labels with these names (missing labels are created; [] clears them).",
      inputSchema: z.object({ task: taskRef, labels: z.array(z.string()) }),
      outputSchema: z.object({ task: taskDetailOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ task, labels: names }) =>
      safely(async () => {
        const id = await tasks.resolveId(ctx.userId, task)
        await labels.setForTask(ctx.actor, id, await ensureLabelIds(ctx, names))
        return json({
          task: serializeTaskDetail(
            await tasks.get(ctx.userId, id),
            ctx.timezone
          ),
        })
      })
  )
}
