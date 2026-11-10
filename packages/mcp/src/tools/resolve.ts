/** Turn agent-friendly references (names, "#12") into ids. */
import { NotFoundError } from "@workspace/db/core"

import type { McpContext } from "../context"

/** A project by id or (case-insensitive) name; null clears it. */
export async function resolveProjectId(
  ctx: McpContext,
  project: string | null | undefined
) {
  if (project === undefined || project === null) return project
  const all = await ctx.services.projects.list(ctx.userId, {
    includeArchived: true,
  })
  const match =
    all.find((p) => p.id === project) ??
    all.find((p) => p.name.toLowerCase() === project.trim().toLowerCase())
  if (!match) {
    const names = all.map((p) => p.name).join(", ") || "none yet"
    throw new NotFoundError(
      `Project "${project}" (existing projects: ${names}). Create it with create_project`
    )
  }
  return match.id
}

/** Label ids for names, creating labels that don't exist yet. */
export async function ensureLabelIds(ctx: McpContext, names: string[]) {
  return (await ctx.services.labels.ensure(ctx.actor, names)).map(
    (label) => label.id
  )
}
