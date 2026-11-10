/**
 * JSON shapes returned by tools, with matching output schemas. Times are ISO
 * 8601; due dates also carry a `display` label in the user's current zone.
 */
import type { Actor, TaskDetail, TaskSummary } from "@workspace/db/core"
import { formatDue, type Due } from "@workspace/db/time"
import { z } from "zod"

const actorOutput = z.object({
  type: z.enum(["user", "agent", "system"]),
  name: z.string(),
})

const dueOutput = z
  .object({
    kind: z.enum(["date", "instant"]),
    date: z.string().optional(),
    at: z.string().optional(),
    timezone: z.string().optional(),
    display: z.string(),
  })
  .nullable()

const statusOutput = z.object({
  key: z.string(),
  name: z.string(),
  category: z.string(),
})
const progressOutput = z.object({ done: z.number(), total: z.number() })

export const taskSummaryOutput = z.object({
  id: z.string(),
  number: z.number(),
  ref: z.string(),
  title: z.string(),
  status: statusOutput,
  priority: z.string(),
  due: dueOutput,
  project: z.object({ id: z.string(), name: z.string() }).nullable(),
  labels: z.array(z.string()),
  parentTaskId: z.string().nullable(),
  openBlockers: z.number(),
  checklist: progressOutput,
  subtasks: progressOutput,
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: actorOutput,
  updatedBy: actorOutput,
})

export const taskDetailOutput = taskSummaryOutput.extend({
  description: z.string(),
  subtaskList: z.array(
    z.object({ ref: z.string(), title: z.string(), status: z.string() })
  ),
})

const serializeActor = (actor: Actor) => ({
  type: actor.type,
  name: actor.label,
})

function serializeDue(
  due: Due | null,
  timezone: string
): z.infer<typeof dueOutput> {
  if (!due) return null
  const display = formatDue(due, timezone)
  return due.kind === "date"
    ? { kind: "date", date: due.date, display }
    : {
        kind: "instant",
        at: due.at.toISOString(),
        timezone: due.timezone,
        display,
      }
}

export function serializeTask(
  task: TaskSummary,
  timezone: string
): z.infer<typeof taskSummaryOutput> {
  return {
    id: task.id,
    number: task.number,
    ref: `#${task.number}`,
    title: task.title,
    status: {
      key: task.status.key,
      name: task.status.name,
      category: task.status.category,
    },
    priority: task.priority,
    due: serializeDue(task.due, timezone),
    project: task.project && { id: task.project.id, name: task.project.name },
    labels: task.labels.map((label) => label.name),
    parentTaskId: task.parentTaskId,
    openBlockers: task.openBlockers,
    checklist: task.progress.checklist,
    subtasks: task.progress.subtasks,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    createdBy: serializeActor(task.createdBy),
    updatedBy: serializeActor(task.updatedBy),
  }
}

export function serializeTaskDetail(
  task: TaskDetail,
  timezone: string
): z.infer<typeof taskDetailOutput> {
  return {
    ...serializeTask(task, timezone),
    description: task.description,
    subtaskList: task.subtasks.map((sub) => ({
      ref: `#${sub.number}`,
      title: sub.title,
      status: sub.status.key,
    })),
  }
}
