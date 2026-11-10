import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"

import { assertCanDelete, type Actor } from "../actor"
import {
  createLabelInput,
  labelNames,
  updateLabelInput,
  type CreateLabelInput,
  type UpdateLabelInput,
} from "../catalog-inputs"
import type { Database } from "../database"
import { NotFoundError, ValidationError } from "../errors"
import type { TaskEventPayload } from "../events"
import { label, task, taskLabel } from "../schema"
import { recordEvents } from "./activity"

export interface Label {
  id: string
  name: string
  color: string | null
}

const toLabel = ({ id, name, color }: typeof label.$inferSelect): Label => ({
  id,
  name,
  color,
})

const live = (userId: string) =>
  and(eq(label.userId, userId), isNull(label.deletedAt))

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } }).cause
  return (
    (error as { code?: string }).code === "23505" || cause?.code === "23505"
  )
}

export function createLabelService(db: Database) {
  async function load(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(label)
      .where(and(live(userId), eq(label.id, id)))
    if (!row) throw new NotFoundError(`Label ${id}`)
    return row
  }

  async function findByName(userId: string, name: string) {
    const [row] = await db
      .select()
      .from(label)
      .where(and(live(userId), sql`lower(${label.name}) = lower(${name})`))
    return row
  }

  async function insert(actor: Actor, raw: CreateLabelInput): Promise<Label> {
    const input = createLabelInput.parse(raw)
    try {
      const [row] = await db
        .insert(label)
        .values({ userId: actor.userId, ...input })
        .returning()
      return toLabel(row!)
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ValidationError(
          `A label named "${input.name}" already exists`
        )
      throw error
    }
  }

  async function loadTask(userId: string, taskId: string) {
    const [row] = await db
      .select({ id: task.id })
      .from(task)
      .where(
        and(
          eq(task.id, taskId),
          eq(task.userId, userId),
          isNull(task.deletedAt)
        )
      )
    if (!row) throw new NotFoundError(`Task ${taskId}`)
    return row.id
  }

  return {
    async list(userId: string): Promise<Label[]> {
      const rows = await db
        .select()
        .from(label)
        .where(live(userId))
        .orderBy(asc(sql`lower(${label.name})`))
      return rows.map(toLabel)
    },

    create: insert,

    async update(
      actor: Actor,
      id: string,
      raw: UpdateLabelInput
    ): Promise<Label> {
      const input = updateLabelInput.parse(raw)
      const current = await load(actor.userId, id)
      try {
        const [row] = await db
          .update(label)
          .set(input)
          .where(eq(label.id, current.id))
          .returning()
        return toLabel(row!)
      } catch (error) {
        if (isUniqueViolation(error))
          throw new ValidationError(
            `A label named "${input.name}" already exists`
          )
        throw error
      }
    },

    /** Labels by name, creating missing ones (case-insensitive). Handy for agents. */
    async ensure(actor: Actor, names: string[]): Promise<Label[]> {
      const result: Label[] = []
      for (const name of labelNames.parse(names)) {
        const existing = await findByName(actor.userId, name)
        result.push(
          existing ? toLabel(existing) : await insert(actor, { name })
        )
      }
      return result
    },

    /**
     * Replace a task's labels. Assigning/unassigning is an edit (agents may do
     * it); deleting the label itself is not.
     */
    async setForTask(
      actor: Actor,
      taskId: string,
      labelIds: string[]
    ): Promise<Label[]> {
      const id = await loadTask(actor.userId, taskId)
      const wanted = [...new Set(labelIds)]
      const found = wanted.length
        ? await db
            .select()
            .from(label)
            .where(and(live(actor.userId), inArray(label.id, wanted)))
        : []
      if (found.length !== wanted.length)
        throw new NotFoundError("One or more labels")

      const current = await db
        .select({ id: label.id, name: label.name })
        .from(taskLabel)
        .innerJoin(label, eq(label.id, taskLabel.labelId))
        .where(eq(taskLabel.taskId, id))
      const added = found.filter((l) => !current.some((c) => c.id === l.id))
      const removed = current.filter((c) => !wanted.includes(c.id))
      const events: TaskEventPayload[] = [
        ...added.map((l) => ({
          type: "label_added" as const,
          labelId: l.id,
          name: l.name,
        })),
        ...removed.map((l) => ({
          type: "label_removed" as const,
          labelId: l.id,
          name: l.name,
        })),
      ]

      if (events.length) {
        await db.transaction(async (tx) => {
          if (removed.length) {
            await tx.delete(taskLabel).where(
              and(
                eq(taskLabel.taskId, id),
                inArray(
                  taskLabel.labelId,
                  removed.map((l) => l.id)
                )
              )
            )
          }
          if (added.length) {
            await tx
              .insert(taskLabel)
              .values(added.map((l) => ({ taskId: id, labelId: l.id })))
          }
          await tx.update(task).set({ updatedBy: actor }).where(eq(task.id, id))
          await recordEvents(tx, actor, id, events)
        })
      }
      return found.map(toLabel).sort((a, b) => a.name.localeCompare(b.name))
    },

    /** User only. The label disappears from tasks; its name can be reused. */
    async softDelete(actor: Actor, id: string): Promise<void> {
      assertCanDelete(actor, "labels")
      const current = await load(actor.userId, id)
      await db
        .update(label)
        .set({ deletedAt: new Date(), deletedBy: actor })
        .where(eq(label.id, current.id))
    },
  }
}
