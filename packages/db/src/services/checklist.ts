import { and, asc, desc, eq, gt, isNull, ne } from "drizzle-orm"
import { generateKeyBetween } from "fractional-indexing"
import { z } from "zod"

import { assertCanDelete, type Actor } from "../actor"
import type { Database } from "../database"
import { NotFoundError, ValidationError } from "../errors"
import { task, taskChecklistItem } from "../schema"
import { recordEvents } from "./activity"
import { createTaskService, type TaskRef } from "./tasks"

const itemText = z.string().trim().min(1, "Checklist item is empty").max(1_000)

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  position: string
}

const toItem = ({
  id,
  text,
  done,
  position,
}: typeof taskChecklistItem.$inferSelect): ChecklistItem => ({
  id,
  text,
  done,
  position,
})

export function createChecklistService(db: Database) {
  const tasks = createTaskService(db)
  const liveIn = (taskId: string, exceptId?: string) =>
    and(
      eq(taskChecklistItem.taskId, taskId),
      isNull(taskChecklistItem.deletedAt),
      exceptId ? ne(taskChecklistItem.id, exceptId) : undefined
    )

  /** An item the user owns (through its task). */
  async function load(userId: string, id: string) {
    const [row] = await db
      .select({ item: taskChecklistItem })
      .from(taskChecklistItem)
      .innerJoin(task, eq(task.id, taskChecklistItem.taskId))
      .where(
        and(
          eq(taskChecklistItem.id, id),
          eq(task.userId, userId),
          isNull(task.deletedAt),
          isNull(taskChecklistItem.deletedAt)
        )
      )
    if (!row) throw new NotFoundError(`Checklist item ${id}`)
    return row.item
  }

  async function edge(taskId: string, last: boolean, exceptId?: string) {
    const [row] = await db
      .select({ position: taskChecklistItem.position })
      .from(taskChecklistItem)
      .where(liveIn(taskId, exceptId))
      .orderBy(
        last
          ? desc(taskChecklistItem.position)
          : asc(taskChecklistItem.position)
      )
      .limit(1)
    return row?.position ?? null
  }

  async function neighbour(taskId: string, of: string, exceptId: string) {
    const [row] = await db
      .select({ position: taskChecklistItem.position })
      .from(taskChecklistItem)
      .where(and(liveIn(taskId, exceptId), gt(taskChecklistItem.position, of)))
      .orderBy(asc(taskChecklistItem.position))
      .limit(1)
    return row?.position ?? null
  }

  async function write(
    actor: Actor,
    item: typeof taskChecklistItem.$inferSelect,
    set: Partial<typeof taskChecklistItem.$inferInsert>,
    event: "checklist_updated" | "checklist_toggled" | "checklist_removed"
  ): Promise<ChecklistItem> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(taskChecklistItem)
        .set(set)
        .where(eq(taskChecklistItem.id, item.id))
        .returning()
      const base = { itemId: item.id, text: row!.text }
      await recordEvents(tx, actor, item.taskId, [
        event === "checklist_toggled"
          ? { type: event, ...base, done: row!.done }
          : { type: event, ...base },
      ])
      return toItem(row!)
    })
  }

  return {
    async list(userId: string, taskRef: TaskRef): Promise<ChecklistItem[]> {
      const taskId = await tasks.resolveId(userId, taskRef)
      const rows = await db
        .select()
        .from(taskChecklistItem)
        .where(liveIn(taskId))
        .orderBy(asc(taskChecklistItem.position))
      return rows.map(toItem)
    },

    async add(
      actor: Actor,
      taskRef: TaskRef,
      text: string
    ): Promise<ChecklistItem> {
      const value = itemText.parse(text)
      const taskId = await tasks.resolveId(actor.userId, taskRef)
      const position = generateKeyBetween(await edge(taskId, true), null)
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(taskChecklistItem)
          .values({ taskId, text: value, position, createdBy: actor })
          .returning()
        await recordEvents(tx, actor, taskId, [
          { type: "checklist_added", itemId: row!.id, text: value },
        ])
        return toItem(row!)
      })
    },

    async rename(
      actor: Actor,
      id: string,
      text: string
    ): Promise<ChecklistItem> {
      const value = itemText.parse(text)
      const item = await load(actor.userId, id)
      if (item.text === value) return toItem(item)
      return write(actor, item, { text: value }, "checklist_updated")
    },

    /** Check or uncheck (flips when `done` is omitted). */
    async toggle(
      actor: Actor,
      id: string,
      done?: boolean
    ): Promise<ChecklistItem> {
      const item = await load(actor.userId, id)
      const next = done ?? !item.done
      if (next === item.done) return toItem(item)
      return write(actor, item, { done: next }, "checklist_toggled")
    },

    /** Put an item directly after another (or first when `afterItemId` is null). */
    async reorder(
      actor: Actor,
      id: string,
      afterItemId: string | null
    ): Promise<ChecklistItem> {
      const item = await load(actor.userId, id)
      let lower: string | null = null
      if (afterItemId) {
        const after = await load(actor.userId, afterItemId)
        if (after.taskId !== item.taskId || after.id === item.id) {
          throw new ValidationError(
            "afterItemId must be another item on the same task"
          )
        }
        lower = after.position
      }
      const upper =
        lower === null
          ? await edge(item.taskId, false, item.id)
          : await neighbour(item.taskId, lower, item.id)
      const [row] = await db
        .update(taskChecklistItem)
        .set({ position: generateKeyBetween(lower, upper) })
        .where(eq(taskChecklistItem.id, item.id))
        .returning()
      return toItem(row!)
    },

    /** User only (soft delete). */
    async remove(actor: Actor, id: string): Promise<void> {
      assertCanDelete(actor, "checklist items")
      const item = await load(actor.userId, id)
      await write(
        actor,
        item,
        { deletedAt: new Date(), deletedBy: actor },
        "checklist_removed"
      )
    },
  }
}
