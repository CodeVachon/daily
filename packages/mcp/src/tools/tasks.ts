import {
  PRIORITIES,
  STATUS_CATEGORIES,
  type ListTasksInput,
} from "@workspace/db/core"
import { parseDue } from "@workspace/db/time"
import { z } from "zod"

import type { McpContext } from "../context"
import { taskRef } from "./inputs"
import { ensureLabelIds, resolveProjectId } from "./resolve"
import {
  serializeTask,
  serializeTaskDetail,
  taskDetailOutput,
  taskSummaryOutput,
} from "./serialize"
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

const status = z
  .string()
  .describe(
    `Status key (backlog, todo, in_progress, blocked, done, cancelled) or category (${STATUS_CATEGORIES.join(", ")})`
  )
const due = z
  .string()
  .nullable()
  .describe(
    'Due date: "2026-11-14" (that day wherever the user is), "2026-11-14T17:00" (5pm in the user\'s current time zone) or ISO with offset. null clears it.'
  )
const project = z
  .string()
  .nullable()
  .describe("Project name or id; null removes it")
const labels = z
  .array(z.string())
  .describe("Label names; missing labels are created")

const fields = {
  title: z.string().describe("Short, actionable title"),
  description: z
    .string()
    .describe("Markdown details: context, links, acceptance criteria"),
  status,
  priority: z.enum(PRIORITIES).describe("none, urgent, high, medium or low"),
  due,
  project,
}

const taskOutput = z.object({ task: taskDetailOutput })
const listOutput = z.object({
  tasks: z.array(taskSummaryOutput),
  hasMore: z.boolean(),
})

const parseDueFor = (ctx: McpContext, value: string | null | undefined) =>
  value === undefined || value === null ? value : parseDue(value, ctx.timezone)

async function detail(ctx: McpContext, ref: string | number) {
  return json({
    task: serializeTaskDetail(
      await ctx.services.tasks.get(ctx.userId, ref),
      ctx.timezone
    ),
  })
}

async function list(ctx: McpContext, filters: ListTasksInput) {
  const page = await ctx.services.tasks.list(ctx.userId, filters)
  return json({
    tasks: page.tasks.map((task) => serializeTask(task, ctx.timezone)),
    hasMore: page.hasMore,
  })
}

/** Core task tools. Agents can create and change tasks but never delete them. */
export const taskTools: ToolModule = (server, ctx) => {
  server.registerTool(
    "list_statuses",
    {
      title: "List statuses",
      description:
        "The board columns in order, with the category each belongs to (open, active, done, cancelled).",
      inputSchema: z.object({}),
      outputSchema: z.object({
        statuses: z.array(
          z.object({ key: z.string(), name: z.string(), category: z.string() })
        ),
      }),
      annotations: readOnly,
    },
    async () =>
      json({
        statuses: (await ctx.services.tasks.statuses()).map(
          ({ key, name, category }) => ({ key, name, category })
        ),
      })
  )

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description:
        "File a new task for the user (e.g. a follow-up from this conversation). Defaults to status todo and no priority. Returns the task with its #number.",
      inputSchema: z.object({
        title: fields.title,
        description: fields.description.optional(),
        status: status.optional(),
        priority: fields.priority.optional(),
        due: due.optional(),
        project: project.optional(),
        labels: labels.optional(),
        parent: taskRef
          .optional()
          .describe("Make this a subtask of another task"),
      }),
      outputSchema: taskOutput,
      annotations: write,
    },
    async (input) =>
      safely(async () => {
        const created = await ctx.services.tasks.create(ctx.actor, {
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          due: parseDueFor(ctx, input.due),
          projectId: await resolveProjectId(ctx, input.project),
          parentTaskId:
            input.parent === undefined ? undefined : String(input.parent),
        })
        if (input.labels?.length) {
          await ctx.services.labels.setForTask(
            ctx.actor,
            created.id,
            await ensureLabelIds(ctx, input.labels)
          )
        }
        return detail(ctx, created.id)
      })
  )

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Change a task's fields. Only the fields you pass change; every change is recorded in the task's history under your name. Use move_task to reorder on the board.",
      inputSchema: z.object({
        task: taskRef,
        title: fields.title.optional(),
        description: fields.description.optional(),
        status: status.optional(),
        priority: fields.priority.optional(),
        due: due.optional(),
        project: project.optional(),
        labels: labels
          .optional()
          .describe("Replace the task's labels with these names"),
      }),
      outputSchema: taskOutput,
      annotations: { ...write, idempotentHint: true },
    },
    async ({
      task,
      labels: labelNames,
      project: projectRef,
      due: dueValue,
      ...rest
    }) =>
      safely(async () => {
        const updated = await ctx.services.tasks.update(ctx.actor, task, {
          ...rest,
          ...(dueValue !== undefined
            ? { due: parseDueFor(ctx, dueValue) }
            : {}),
          ...(projectRef !== undefined
            ? { projectId: await resolveProjectId(ctx, projectRef) }
            : {}),
        })
        if (labelNames) {
          await ctx.services.labels.setForTask(
            ctx.actor,
            updated.id,
            await ensureLabelIds(ctx, labelNames)
          )
        }
        return detail(ctx, updated.id)
      })
  )

  server.registerTool(
    "move_task",
    {
      title: "Move task",
      description:
        "Move a task to a status column, optionally placing it between two tasks in that column (like dragging a card on the board).",
      inputSchema: z.object({
        task: taskRef,
        status,
        after: taskRef.optional().describe("Place directly below this task"),
        before: taskRef.optional().describe("Place directly above this task"),
      }),
      outputSchema: taskOutput,
      annotations: write,
    },
    async ({ task, status: target, after, before }) =>
      safely(async () => {
        const resolve = (ref: string | number | undefined) =>
          ref === undefined
            ? undefined
            : ctx.services.tasks.resolveId(ctx.userId, ref)
        const moved = await ctx.services.tasks.move(ctx.actor, task, {
          status: target,
          afterTaskId: await resolve(after),
          beforeTaskId: await resolve(before),
        })
        return detail(ctx, moved.id)
      })
  )

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description:
        "One task in full: fields, Markdown description and subtasks.",
      inputSchema: z.object({ task: taskRef }),
      outputSchema: taskOutput,
      annotations: readOnly,
    },
    async ({ task }) => safely(() => detail(ctx, task))
  )

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description:
        "List the user's tasks with filters. Due windows (overdue, today, week) use the user's current time zone. Results are in board order unless order_by is set.",
      inputSchema: z.object({
        status: z
          .array(z.string())
          .optional()
          .describe('Status keys and/or categories, e.g. ["open", "active"]'),
        project: z.string().optional().describe("Project name or id"),
        label: z.string().optional().describe("Label name"),
        priority: z.array(z.enum(PRIORITIES)).optional(),
        due: z.enum(["overdue", "today", "week", "none", "any"]).optional(),
        parent: taskRef
          .nullable()
          .optional()
          .describe("Subtasks of this task; null = top-level tasks only"),
        order_by: z.enum(["board", "updated", "due"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
      outputSchema: listOutput,
      annotations: readOnly,
    },
    async (input) =>
      safely(async () => {
        const label = input.label
          ? (await ctx.services.labels.list(ctx.userId)).find(
              (l) => l.name.toLowerCase() === input.label!.toLowerCase()
            )
          : undefined
        if (input.label && !label) return json({ tasks: [], hasMore: false })
        return list(ctx, {
          status: input.status,
          projectId: (await resolveProjectId(ctx, input.project)) ?? undefined,
          labelId: label?.id,
          priority: input.priority,
          due: input.due,
          parentTaskId:
            input.parent === undefined || input.parent === null
              ? input.parent
              : await ctx.services.tasks.resolveId(ctx.userId, input.parent),
          orderBy: input.order_by,
          limit: input.limit ?? 25,
          offset: input.offset,
        })
      })
  )

  server.registerTool(
    "search_tasks",
    {
      title: "Search tasks",
      description:
        'Full-text search over task titles and descriptions; "#12" finds task 12. Most recently updated first.',
      inputSchema: z.object({
        query: z.string().min(1),
        include_done: z
          .boolean()
          .optional()
          .describe("Also search done and cancelled tasks (default true)"),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      outputSchema: listOutput,
      annotations: readOnly,
    },
    async ({ query, include_done = true, limit = 20 }) =>
      safely(() =>
        list(ctx, {
          text: query,
          status: include_done ? undefined : ["open", "active"],
          orderBy: "updated",
          limit,
        })
      )
  )
}
