/**
 * Validated inputs for task writes, shared by the web UI and MCP tools so both
 * accept exactly the same shapes.
 */
import { z } from "zod"

import { isValidTimeZone } from "./time"

export const PRIORITIES = ["none", "urgent", "high", "medium", "low"] as const
export type Priority = (typeof PRIORITIES)[number]

export const STATUS_CATEGORIES = [
  "open",
  "active",
  "done",
  "cancelled",
] as const
export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

const timeZone = z.string().refine(isValidTimeZone, "Unknown IANA time zone")

/** A due date: a floating calendar day, or a fixed instant with its zone. */
const dueInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("date"),
    date: z.iso.date(),
  }),
  z.object({
    kind: z.literal("instant"),
    at: z.coerce.date(),
    timezone: timeZone,
  }),
])

const title = z.string().trim().min(1, "Title is required").max(500)
const description = z.string().max(50_000)
/** A status key ("in_progress") or a category ("done"); see tasks.resolveStatus. */
const status = z.string().trim().min(1)

export const createTaskInput = z.object({
  title,
  description: description.default(""),
  status: status.default("todo"),
  priority: z.enum(PRIORITIES).default("none"),
  due: dueInput.nullable().default(null),
  projectId: z.string().nullable().default(null),
  parentTaskId: z.string().nullable().default(null),
})
export type CreateTaskInput = z.input<typeof createTaskInput>

export const updateTaskInput = z
  .object({
    title,
    description,
    status,
    priority: z.enum(PRIORITIES),
    due: dueInput.nullable(),
    projectId: z.string().nullable(),
  })
  .partial()
export type UpdateTaskInput = z.input<typeof updateTaskInput>

export const moveTaskInput = z.object({
  status,
  /** The task that should end up directly above this one (null = top). */
  afterTaskId: z.string().nullable().optional(),
  /** The task that should end up directly below this one (null = bottom). */
  beforeTaskId: z.string().nullable().optional(),
})
export type MoveTaskInput = z.input<typeof moveTaskInput>

const DUE_WINDOWS = ["overdue", "today", "week", "none", "any"] as const

export const listTasksInput = z.object({
  /** Status keys or categories. */
  status: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  labelId: z.string().optional(),
  priority: z.array(z.enum(PRIORITIES)).optional(),
  due: z.enum(DUE_WINDOWS).optional(),
  /** Only subtasks of this task; `null` for top-level tasks only. */
  parentTaskId: z.string().nullable().optional(),
  /** Full-text query, or a task number like "#12". */
  text: z.string().trim().min(1).optional(),
  /** Soft-deleted tasks only (the user's Trash). */
  deleted: z.boolean().default(false),
  orderBy: z.enum(["board", "updated", "due"]).default("board"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
})
export type ListTasksInput = z.input<typeof listTasksInput>
