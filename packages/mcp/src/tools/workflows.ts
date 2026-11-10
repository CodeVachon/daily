import { ResourceTemplate } from "@modelcontextprotocol/server"
import { describeEvent } from "@workspace/db/core"
import { formatDue } from "@workspace/db/time"
import { z } from "zod"

import type { McpContext } from "../context"
import type { ToolModule } from "./types"

const user = (text: string) => ({
  messages: [
    { role: "user" as const, content: { type: "text" as const, text } },
  ],
})

/** A task as a Markdown document: fields, description, checklist, comments, history. */
async function taskMarkdown(ctx: McpContext, ref: string): Promise<string> {
  const { tasks, checklist, comments, activity } = ctx.services
  const task = await tasks.get(ctx.userId, ref)
  const [items, notes, events] = await Promise.all([
    checklist.list(ctx.userId, task.id),
    comments.list(ctx.userId, task.id),
    activity.forTask(ctx.userId, task.id, 10),
  ])
  const meta = [
    `Status: ${task.status.name} · Priority: ${task.priority}`,
    task.due ? `Due: ${formatDue(task.due, ctx.timezone)}` : null,
    task.project ? `Project: ${task.project.name}` : null,
    task.labels.length
      ? `Labels: ${task.labels.map((l) => l.name).join(", ")}`
      : null,
    task.openBlockers ? `Blocked by ${task.openBlockers} open task(s)` : null,
  ].filter(Boolean)
  return [
    `# #${task.number} ${task.title}`,
    meta.join("\n"),
    task.description || "_No description._",
    items.length
      ? `## Checklist\n${items.map((i) => `- [${i.done ? "x" : " "}] ${i.text}`).join("\n")}`
      : null,
    task.subtasks.length
      ? `## Subtasks\n${task.subtasks.map((s) => `- #${s.number} ${s.title} (${s.status.name})`).join("\n")}`
      : null,
    notes.length
      ? `## Comments\n${notes.map((c) => `**${c.author.label}** (${c.createdAt.toISOString()}):\n${c.body}`).join("\n\n")}`
      : null,
    events.length
      ? `## Recent activity\n${events.map((e) => `- ${e.at.toISOString()} ${e.actor.label} ${describeEvent(e.payload)}`).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}

/** Prompts for common task workflows, and tasks as readable resources. */
export const workflowModule: ToolModule = (server, ctx) => {
  server.registerPrompt(
    "capture_task",
    {
      title: "Capture a task",
      description: "File a task in Daily from the current conversation.",
      argsSchema: z.object({
        hint: z
          .string()
          .optional()
          .describe("What the task is about, if not obvious"),
      }),
    },
    ({ hint }) =>
      user(
        [
          "File a task in Daily for the follow-up work from our conversation" +
            (hint ? `: ${hint}` : "."),
          "1. Search first (search_tasks) so you don't create a duplicate; if one exists, add a comment or update it instead.",
          "2. Otherwise call create_task with a short actionable title and a Markdown description holding the context someone needs later (what, why, links, acceptance criteria).",
          "3. Set priority and a due date only if they were stated or are clearly implied; use labels/project if they obviously apply (list_projects, list_labels).",
          "4. Reply with the task's #number and title.",
        ].join("\n")
      )
  )

  server.registerPrompt(
    "triage_inbox",
    {
      title: "Triage tasks",
      description:
        "Review recent and untriaged tasks and propose priorities, due dates and statuses.",
    },
    () =>
      user(
        [
          "Help me triage my Daily tasks.",
          '1. get_updates_since to see what changed recently, and list_tasks with status ["backlog", "todo"] ordered by updated.',
          "2. For each task without a priority or due date, propose one with a one-line reason; flag duplicates and stale tasks.",
          "3. Show the proposals as a table and ask me before applying anything; then apply the approved changes with update_task.",
          "Never delete tasks: suggest cancelling (status cancelled) instead.",
        ].join("\n")
      )
  )

  server.registerPrompt(
    "next_up",
    {
      title: "What should I work on next?",
      description:
        "Recommend the next 1-3 tasks from what's overdue, due today, in progress and unblocked.",
    },
    () =>
      user(
        [
          "What should I work on next in Daily?",
          'Look at list_tasks with due "overdue", due "today", and status ["active"]; skip tasks with openBlockers > 0 unless the blocker is what to do next.',
          "Weigh priority, due date (in my current time zone) and anything already in progress. Recommend 1-3 tasks with a one-line reason each, as #number and title.",
        ].join("\n")
      )
  )

  server.registerResource(
    "task",
    new ResourceTemplate("daily://task/{ref}", {
      list: async () => {
        const { tasks } = await ctx.services.tasks.list(ctx.userId, {
          status: ["open", "active"],
          orderBy: "updated",
          limit: 50,
        })
        return {
          resources: tasks.map((task) => ({
            uri: `daily://task/${task.number}`,
            name: `#${task.number} ${task.title}`,
            mimeType: "text/markdown",
          })),
        }
      },
    }),
    {
      title: "Task",
      description:
        "A task as Markdown: fields, description, checklist, subtasks, comments and recent history.",
      mimeType: "text/markdown",
    },
    async (uri, { ref }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: await taskMarkdown(ctx, String(ref)),
        },
      ],
    })
  )
}
