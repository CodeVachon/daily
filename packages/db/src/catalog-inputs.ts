/** Validated inputs for projects and labels (shared by UI and MCP). */
import { z } from "zod"

/** Preset palette; the UI maps these to theme colours. */
const COLORS = [
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
  "rose",
] as const

const name = z.string().trim().min(1, "Name is required").max(80)
const color = z.enum(COLORS).nullable()

export const createProjectInput = z.object({ name, color: color.default(null) })
export type CreateProjectInput = z.input<typeof createProjectInput>

export const updateProjectInput = z
  .object({ name, color, archived: z.boolean() })
  .partial()
export type UpdateProjectInput = z.input<typeof updateProjectInput>

export const createLabelInput = z.object({ name, color: color.default(null) })
export type CreateLabelInput = z.input<typeof createLabelInput>

export const updateLabelInput = z.object({ name, color }).partial()
export type UpdateLabelInput = z.input<typeof updateLabelInput>

export const labelNames = z.array(name).max(50)
