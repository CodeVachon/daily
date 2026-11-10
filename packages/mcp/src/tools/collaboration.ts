import { ValidationError, type Services } from "@workspace/db/core"
import { z } from "zod"

import { taskRef } from "./inputs"
import {
  actorOutput,
  serializeActor,
  serializeTaskDetail,
  taskDetailOutput,
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

const commentOutput = z.object({
  id: z.string(),
  body: z.string(),
  author: actorOutput,
  createdAt: z.string(),
  editedAt: z.string().nullable(),
})
const checklistItemOutput = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
})
const dependencyOutput = z.object({
  ref: z.string(),
  id: z.string(),
  title: z.string(),
  status: z.string(),
  open: z.boolean(),
})

type Comment = Awaited<ReturnType<Services["comments"]["add"]>>
type Item = Awaited<ReturnType<Services["checklist"]["add"]>>

const serializeComment = (c: Comment) => ({
  id: c.id,
  body: c.body,
  author: serializeActor(c.author),
  createdAt: c.createdAt.toISOString(),
  editedAt: c.editedAt?.toISOString() ?? null,
})
const serializeItem = ({ id, text, done }: Item) => ({ id, text, done })

/**
 * Comments, checklists, subtasks and dependencies. Agents can add and edit;
 * removing anything is left to the user in the app.
 */
export const collaborationTools: ToolModule = (server, ctx) => {
  const { comments, checklist, dependencies, tasks } = ctx.services

  server.registerTool(
    "list_comments",
    {
      title: "List comments",
      description: "A task's comments, oldest first, with who wrote each.",
      inputSchema: z.object({ task: taskRef }),
      outputSchema: z.object({ comments: z.array(commentOutput) }),
      annotations: readOnly,
    },
    async ({ task }) =>
      safely(async () =>
        json({
          comments: (await comments.list(ctx.userId, task)).map(
            serializeComment
          ),
        })
      )
  )

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description:
        "Comment on a task in Markdown: progress notes, findings, links to PRs. Attributed to you in the task's history.",
      inputSchema: z.object({
        task: taskRef,
        body: z.string().describe("Markdown"),
      }),
      outputSchema: z.object({ comment: commentOutput }),
      annotations: write,
    },
    async ({ task, body }) =>
      safely(async () =>
        json({
          comment: serializeComment(await comments.add(ctx.actor, task, body)),
        })
      )
  )

  server.registerTool(
    "edit_comment",
    {
      title: "Edit comment",
      description:
        "Edit one of your own comments. The previous text is kept as a revision.",
      inputSchema: z.object({
        comment_id: z.string(),
        body: z.string().describe("Markdown"),
      }),
      outputSchema: z.object({ comment: commentOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ comment_id, body }) =>
      safely(async () =>
        json({
          comment: serializeComment(
            await comments.edit(ctx.actor, comment_id, body)
          ),
        })
      )
  )

  server.registerTool(
    "list_checklist",
    {
      title: "List checklist",
      description: "A task's checklist items in order.",
      inputSchema: z.object({ task: taskRef }),
      outputSchema: z.object({ items: z.array(checklistItemOutput) }),
      annotations: readOnly,
    },
    async ({ task }) =>
      safely(async () =>
        json({
          items: (await checklist.list(ctx.userId, task)).map(serializeItem),
        })
      )
  )

  server.registerTool(
    "add_checklist_item",
    {
      title: "Add checklist item",
      description: "Add a step to a task's checklist (appended at the end).",
      inputSchema: z.object({ task: taskRef, text: z.string() }),
      outputSchema: z.object({ item: checklistItemOutput }),
      annotations: write,
    },
    async ({ task, text }) =>
      safely(async () =>
        json({
          item: serializeItem(await checklist.add(ctx.actor, task, text)),
        })
      )
  )

  server.registerTool(
    "update_checklist_item",
    {
      title: "Update checklist item",
      description:
        "Rename, check/uncheck, or move a checklist item (after another item, or to the top with after: null).",
      inputSchema: z.object({
        item_id: z.string(),
        text: z.string().optional(),
        done: z.boolean().optional(),
        after: z
          .string()
          .nullable()
          .optional()
          .describe("Item id to place this after; null = top"),
      }),
      outputSchema: z.object({ item: checklistItemOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ item_id, text, done, after }) =>
      safely(async () => {
        if (text === undefined && done === undefined && after === undefined) {
          throw new ValidationError("Pass at least one of text, done or after")
        }
        let item: Item | undefined
        if (text !== undefined)
          item = await checklist.rename(ctx.actor, item_id, text)
        if (done !== undefined)
          item = await checklist.toggle(ctx.actor, item_id, done)
        if (after !== undefined)
          item = await checklist.reorder(ctx.actor, item_id, after)
        return json({ item: serializeItem(item!) })
      })
  )

  server.registerTool(
    "set_task_parent",
    {
      title: "Set task parent",
      description:
        "Make a task a subtask of another (parent), or top-level again (parent: null). To create a new subtask, use create_task with parent.",
      inputSchema: z.object({ task: taskRef, parent: taskRef.nullable() }),
      outputSchema: z.object({ task: taskDetailOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ task, parent }) =>
      safely(async () =>
        json({
          task: serializeTaskDetail(
            await tasks.setParent(ctx.actor, task, parent),
            ctx.timezone
          ),
        })
      )
  )

  server.registerTool(
    "list_dependencies",
    {
      title: "List dependencies",
      description:
        "What blocks a task (blocked_by) and what it blocks (blocking), with whether each is still open.",
      inputSchema: z.object({ task: taskRef }),
      outputSchema: z.object({
        blockedBy: z.array(dependencyOutput),
        blocking: z.array(dependencyOutput),
      }),
      annotations: readOnly,
    },
    async ({ task }) =>
      safely(async () => {
        const deps = await dependencies.list(ctx.userId, task)
        const shape = (d: (typeof deps.blockedBy)[number]) => ({
          ref: `#${d.number}`,
          id: d.id,
          title: d.title,
          status: d.statusKey,
          open: d.open,
        })
        return json({
          blockedBy: deps.blockedBy.map(shape),
          blocking: deps.blocking.map(shape),
        })
      })
  )

  server.registerTool(
    "add_dependency",
    {
      title: "Add dependency",
      description:
        "Record that a task is blocked by another task. Cycles are rejected.",
      inputSchema: z.object({ task: taskRef, blocked_by: taskRef }),
      outputSchema: z.object({ task: taskDetailOutput }),
      annotations: { ...write, idempotentHint: true },
    },
    async ({ task, blocked_by }) =>
      safely(async () => {
        await dependencies.add(ctx.actor, task, blocked_by)
        return json({
          task: serializeTaskDetail(
            await tasks.get(ctx.userId, task),
            ctx.timezone
          ),
        })
      })
  )
}
