import { and, eq, inArray, isNull } from "drizzle-orm"

import { assertCanDelete, type Actor } from "../actor"
import type { Database } from "../database"
import { NotFoundError, ValidationError } from "../errors"
import { task, taskDependency, taskStatus } from "../schema"
import { recordEvents } from "./activity"
import { createTaskService, type TaskRef } from "./tasks"

interface DependencyTask {
  id: string
  number: number
  title: string
  statusKey: string
  /** Still open or active (not done or cancelled). */
  open: boolean
}

/** Stop exploring a dependency graph past this many tasks (single-user scale). */
const MAX_NODES = 10_000

export function createDependencyService(db: Database) {
  const tasks = createTaskService(db)

  async function related(
    taskIds: string[],
    column: "blockers" | "blocking"
  ): Promise<DependencyTask[]> {
    const [match, other] =
      column === "blockers"
        ? [taskDependency.taskId, taskDependency.blockedByTaskId]
        : [taskDependency.blockedByTaskId, taskDependency.taskId]
    const rows = await db
      .select({
        id: task.id,
        number: task.number,
        title: task.title,
        statusKey: task.statusKey,
        category: taskStatus.category,
      })
      .from(taskDependency)
      .innerJoin(task, eq(task.id, other))
      .innerJoin(taskStatus, eq(taskStatus.key, task.statusKey))
      .where(and(inArray(match, taskIds), isNull(task.deletedAt)))
      .orderBy(task.number)
    return rows.map(({ category, ...row }) => ({
      ...row,
      open: category === "open" || category === "active",
    }))
  }

  /** Would "taskId blocked by blockedById" close a loop? (Is taskId upstream of blockedById?) */
  async function createsCycle(
    taskId: string,
    blockedById: string
  ): Promise<boolean> {
    const seen = new Set<string>([blockedById])
    let frontier = [blockedById]
    while (frontier.length && seen.size < MAX_NODES) {
      const upstream = await db
        .select({ id: taskDependency.blockedByTaskId })
        .from(taskDependency)
        .where(inArray(taskDependency.taskId, frontier))
      frontier = []
      for (const { id } of upstream) {
        if (id === taskId) return true
        if (!seen.has(id)) {
          seen.add(id)
          frontier.push(id)
        }
      }
    }
    return false
  }

  return {
    /** What blocks a task, and what it blocks. */
    async list(userId: string, taskRef: TaskRef) {
      const taskId = await tasks.resolveId(userId, taskRef)
      return {
        blockedBy: await related([taskId], "blockers"),
        blocking: await related([taskId], "blocking"),
      }
    },

    async add(
      actor: Actor,
      taskRef: TaskRef,
      blockedByRef: TaskRef
    ): Promise<void> {
      const taskId = await tasks.resolveId(actor.userId, taskRef)
      const blockedById = await tasks.resolveId(actor.userId, blockedByRef)
      if (taskId === blockedById)
        throw new ValidationError("A task can't block itself")
      if (await createsCycle(taskId, blockedById)) {
        throw new ValidationError("That would create a dependency cycle")
      }
      await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(taskDependency)
          .values({ taskId, blockedByTaskId: blockedById, createdBy: actor })
          .onConflictDoNothing()
          .returning({ taskId: taskDependency.taskId })
        if (inserted.length) {
          await recordEvents(tx, actor, taskId, [
            { type: "dependency_added", blockedByTaskId: blockedById },
          ])
        }
      })
    },

    /** User only. */
    async remove(
      actor: Actor,
      taskRef: TaskRef,
      blockedByRef: TaskRef
    ): Promise<void> {
      assertCanDelete(actor, "dependencies")
      const taskId = await tasks.resolveId(actor.userId, taskRef)
      const blockedById = await tasks.resolveId(actor.userId, blockedByRef)
      await db.transaction(async (tx) => {
        const removed = await tx
          .delete(taskDependency)
          .where(
            and(
              eq(taskDependency.taskId, taskId),
              eq(taskDependency.blockedByTaskId, blockedById)
            )
          )
          .returning({ taskId: taskDependency.taskId })
        if (!removed.length) throw new NotFoundError("Dependency")
        await recordEvents(tx, actor, taskId, [
          { type: "dependency_removed", blockedByTaskId: blockedById },
        ])
      })
    },
  }
}
