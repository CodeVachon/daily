import { and, asc, eq, isNull, sql } from "drizzle-orm"

import { assertCanDelete, type Actor } from "../actor"
import {
  createProjectInput,
  updateProjectInput,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "../catalog-inputs"
import type { Database } from "../database"
import { NotFoundError } from "../errors"
import { project } from "../schema"

export interface Project {
  id: string
  name: string
  color: string | null
  archived: boolean
}

const toProject = (row: typeof project.$inferSelect): Project => ({
  id: row.id,
  name: row.name,
  color: row.color,
  archived: row.archivedAt !== null,
})

export function createProjectService(db: Database) {
  async function load(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(project)
      .where(
        and(
          eq(project.id, id),
          eq(project.userId, userId),
          isNull(project.deletedAt)
        )
      )
    if (!row) throw new NotFoundError(`Project ${id}`)
    return row
  }

  return {
    async list(
      userId: string,
      { includeArchived = false } = {}
    ): Promise<Project[]> {
      const rows = await db
        .select()
        .from(project)
        .where(
          and(
            eq(project.userId, userId),
            isNull(project.deletedAt),
            includeArchived ? undefined : isNull(project.archivedAt)
          )
        )
        .orderBy(asc(sql`lower(${project.name})`))
      return rows.map(toProject)
    },

    async get(userId: string, id: string): Promise<Project> {
      return toProject(await load(userId, id))
    },

    async create(actor: Actor, raw: CreateProjectInput): Promise<Project> {
      const input = createProjectInput.parse(raw)
      const [row] = await db
        .insert(project)
        .values({ userId: actor.userId, ...input })
        .returning()
      return toProject(row!)
    },

    async update(
      actor: Actor,
      id: string,
      raw: UpdateProjectInput
    ): Promise<Project> {
      const { archived, ...fields } = updateProjectInput.parse(raw)
      const current = await load(actor.userId, id)
      const [row] = await db
        .update(project)
        .set({
          ...fields,
          ...(archived === undefined
            ? {}
            : {
                archivedAt: archived
                  ? (current.archivedAt ?? new Date())
                  : null,
              }),
        })
        .where(eq(project.id, current.id))
        .returning()
      return toProject(row!)
    },

    /** User only. Tasks keep existing; they just show no project. */
    async softDelete(actor: Actor, id: string): Promise<void> {
      assertCanDelete(actor, "projects")
      const current = await load(actor.userId, id)
      await db
        .update(project)
        .set({ deletedAt: new Date(), deletedBy: actor })
        .where(eq(project.id, current.id))
    },
  }
}
