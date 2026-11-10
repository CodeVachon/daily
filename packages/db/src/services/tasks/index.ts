import { and, asc, eq, inArray, isNull, max } from "drizzle-orm"

import { assertCanDelete, assertCanRestore, type Actor } from "../../actor"
import type { Database } from "../../database"
import { NotFoundError, ValidationError } from "../../errors"
import { diffFields, type TaskEventPayload } from "../../events"
import { project, task, taskStatus } from "../../schema"
import {
  createTaskInput,
  listTasksInput,
  moveTaskInput,
  STATUS_CATEGORIES,
  updateTaskInput,
  type CreateTaskInput,
  type ListTasksInput,
  type MoveTaskInput,
  type UpdateTaskInput,
} from "../../task-inputs"
import { recordEvents } from "../activity"
import { createSettingsService } from "../settings"
import { listConditions, listOrder } from "./filters"
import {
  dueToColumns,
  editableView,
  toSummary,
  type HydratedRow,
  type TaskDetail,
  type TaskStatusInfo,
  type TaskSummary,
} from "./mapping"
import { positionAtEnd, positionBetween } from "./positions"

export type { TaskDetail, TaskSummary, TaskStatusInfo } from "./mapping"

/** A task id, or its number (12 or "#12"). */
export type TaskRef = string | number

const NUMBER_REF = /^#?(\d+)$/

const hydrate = {
  status: true,
  project: { columns: { id: true, name: true, color: true, deletedAt: true } },
  labels: {
    with: {
      label: {
        columns: { id: true, name: true, color: true, deletedAt: true },
      },
    },
  },
} as const

export function createTaskService(db: Database) {
  const settings = createSettingsService(db)

  function refCondition(userId: string, ref: TaskRef) {
    const number = typeof ref === "number" ? ref : NUMBER_REF.exec(ref)?.[1]
    return and(
      eq(task.userId, userId),
      number !== undefined
        ? eq(task.number, Number(number))
        : eq(task.id, String(ref))
    )
  }

  async function load(userId: string, ref: TaskRef, { deleted = false } = {}) {
    const [row] = await db
      .select()
      .from(task)
      .where(
        and(
          refCondition(userId, ref),
          deleted ? undefined : isNull(task.deletedAt)
        )
      )
    if (!row || (deleted && !row.deletedAt))
      throw new NotFoundError(`Task ${ref}`)
    return row
  }

  async function statuses(): Promise<TaskStatusInfo[]> {
    return db.select().from(taskStatus).orderBy(asc(taskStatus.position))
  }

  /** A status key, or a category ("done") meaning its first status. */
  async function resolveStatus(value: string): Promise<TaskStatusInfo> {
    const all = await statuses()
    const match =
      all.find((s) => s.key === value) ??
      ((STATUS_CATEGORIES as readonly string[]).includes(value)
        ? all.find((s) => s.category === value)
        : undefined)
    if (!match) {
      throw new ValidationError(
        `Unknown status "${value}". Use one of: ${all.map((s) => s.key).join(", ")} (or a category: ${STATUS_CATEGORIES.join(", ")})`
      )
    }
    return match
  }

  async function assertProject(userId: string, projectId: string | null) {
    if (!projectId) return
    const [row] = await db
      .select({ id: project.id })
      .from(project)
      .where(
        and(
          eq(project.id, projectId),
          eq(project.userId, userId),
          isNull(project.deletedAt)
        )
      )
    if (!row) throw new NotFoundError(`Project ${projectId}`)
  }

  const completedAtFor = (
    status: TaskStatusInfo,
    previous: Date | null = null
  ) => (status.category === "done" ? (previous ?? new Date()) : null)

  async function get(userId: string, ref: TaskRef): Promise<TaskDetail> {
    const row = await db.query.task.findFirst({
      where: refCondition(userId, ref),
      with: {
        ...hydrate,
        subtasks: {
          where: isNull(task.deletedAt),
          columns: { id: true, number: true, title: true },
          with: { status: true },
          orderBy: asc(task.number),
        },
      },
    })
    if (!row) throw new NotFoundError(`Task ${ref}`)
    return {
      ...toSummary(row as HydratedRow),
      description: row.description,
      subtasks: row.subtasks,
    }
  }

  async function create(
    actor: Actor,
    raw: CreateTaskInput
  ): Promise<TaskDetail> {
    const input = createTaskInput.parse(raw)
    const status = await resolveStatus(input.status)
    await assertProject(actor.userId, input.projectId)
    if (input.parentTaskId) await load(actor.userId, input.parentTaskId)

    const id = await db.transaction(async (tx) => {
      const [last] = await tx
        .select({ number: max(task.number) })
        .from(task)
        .where(eq(task.userId, actor.userId))
      const [row] = await tx
        .insert(task)
        .values({
          userId: actor.userId,
          number: (last?.number ?? 0) + 1,
          title: input.title,
          description: input.description,
          statusKey: status.key,
          priority: input.priority,
          ...dueToColumns(input.due),
          projectId: input.projectId,
          parentTaskId: input.parentTaskId,
          boardPosition: await positionAtEnd(tx, {
            userId: actor.userId,
            statusKey: status.key,
          }),
          completedAt: completedAtFor(status),
          createdBy: actor,
          updatedBy: actor,
        })
        .returning({ id: task.id })
      await recordEvents(tx, actor, row!.id, [{ type: "created" }])
      return row!.id
    })
    return get(actor.userId, id)
  }

  async function update(
    actor: Actor,
    ref: TaskRef,
    raw: UpdateTaskInput
  ): Promise<TaskDetail> {
    const input = updateTaskInput.parse(raw)
    const current = await load(actor.userId, ref)
    if (input.projectId !== undefined)
      await assertProject(actor.userId, input.projectId)

    const { status: statusValue, due, ...fields } = input
    const changes = diffFields(editableView(current), {
      ...fields,
      ...(due !== undefined ? { due } : {}),
    })
    const status = statusValue ? await resolveStatus(statusValue) : null
    const statusChanged = status !== null && status.key !== current.statusKey
    if (changes.length === 0 && !statusChanged)
      return get(actor.userId, current.id)

    const events: TaskEventPayload[] = []
    if (changes.length) events.push({ type: "updated", changes })
    if (statusChanged)
      events.push({
        type: "status_changed",
        from: current.statusKey,
        to: status.key,
      })

    await db.transaction(async (tx) => {
      await tx
        .update(task)
        .set({
          ...fields,
          ...(due !== undefined ? dueToColumns(due) : {}),
          ...(statusChanged
            ? {
                statusKey: status.key,
                boardPosition: await positionAtEnd(tx, {
                  userId: actor.userId,
                  statusKey: status.key,
                  excludeTaskId: current.id,
                }),
                completedAt: completedAtFor(status, current.completedAt),
              }
            : {}),
          updatedBy: actor,
        })
        .where(eq(task.id, current.id))
      await recordEvents(tx, actor, current.id, events)
    })
    return get(actor.userId, current.id)
  }

  async function move(
    actor: Actor,
    ref: TaskRef,
    raw: MoveTaskInput
  ): Promise<TaskDetail> {
    const input = moveTaskInput.parse(raw)
    const current = await load(actor.userId, ref)
    const status = await resolveStatus(input.status)
    const column = {
      userId: actor.userId,
      statusKey: status.key,
      excludeTaskId: current.id,
    }
    const statusChanged = status.key !== current.statusKey

    await db.transaction(async (tx) => {
      await tx
        .update(task)
        .set({
          statusKey: status.key,
          boardPosition: await positionBetween(tx, column, input),
          completedAt: statusChanged
            ? completedAtFor(status, current.completedAt)
            : current.completedAt,
          updatedBy: actor,
        })
        .where(eq(task.id, current.id))
      await recordEvents(tx, actor, current.id, [
        statusChanged
          ? { type: "status_changed", from: current.statusKey, to: status.key }
          : { type: "reordered" },
      ])
    })
    return get(actor.userId, current.id)
  }

  async function list(
    userId: string,
    raw: ListTasksInput = {},
    now = new Date()
  ): Promise<{ tasks: TaskSummary[]; hasMore: boolean }> {
    const filters = listTasksInput.parse(raw)
    const timezone = await settings.getTimezone(userId)
    const page = await db
      .select({ id: task.id })
      .from(task)
      .innerJoin(taskStatus, eq(taskStatus.key, task.statusKey))
      .where(listConditions(userId, filters, now, timezone))
      .orderBy(...listOrder(filters.orderBy))
      .limit(filters.limit + 1)
      .offset(filters.offset)
    const ids = page.slice(0, filters.limit).map((row) => row.id)
    if (ids.length === 0) return { tasks: [], hasMore: false }

    const rows = await db.query.task.findMany({
      where: inArray(task.id, ids),
      with: hydrate,
    })
    const byId = new Map(
      rows.map((row) => [row.id, toSummary(row as HydratedRow)])
    )
    return {
      tasks: ids.map((id) => byId.get(id)!),
      hasMore: page.length > filters.limit,
    }
  }

  async function softDelete(actor: Actor, ref: TaskRef): Promise<void> {
    assertCanDelete(actor, "tasks")
    const current = await load(actor.userId, ref)
    await db.transaction(async (tx) => {
      await tx
        .update(task)
        .set({ deletedAt: new Date(), deletedBy: actor, updatedBy: actor })
        .where(eq(task.id, current.id))
      await recordEvents(tx, actor, current.id, [{ type: "deleted" }])
    })
  }

  async function restore(actor: Actor, ref: TaskRef): Promise<TaskDetail> {
    assertCanRestore(actor, "tasks")
    const current = await load(actor.userId, ref, { deleted: true })
    await db.transaction(async (tx) => {
      await tx
        .update(task)
        .set({ deletedAt: null, deletedBy: null, updatedBy: actor })
        .where(eq(task.id, current.id))
      await recordEvents(tx, actor, current.id, [{ type: "restored" }])
    })
    return get(actor.userId, current.id)
  }

  return {
    statuses,
    resolveStatus,
    get,
    create,
    update,
    move,
    list,
    softDelete,
    restore,
  }
}
