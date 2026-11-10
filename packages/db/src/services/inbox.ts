import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  max,
  sql,
} from "drizzle-orm"

import type { Database } from "../database"
import type { TaskEvent } from "../events"
import { inboxState, task, taskEvent, taskRead } from "../schema"
import { toEvent } from "./activity"

/** Changes the user didn't make themselves: agents and the sync worker. */
const OTHERS = ["agent", "system"] as const

/** Join each event to the user's read position on its task. */
const readPosition = and(
  eq(taskRead.userId, taskEvent.userId),
  eq(taskRead.taskId, taskEvent.taskId)
)

/** Events by others after the task was last read (and after "mark all read"). */
const unseenBy = (userId: string, cleared: number) =>
  and(
    eq(taskEvent.userId, userId),
    inArray(taskEvent.actorType, [...OTHERS]),
    gt(
      taskEvent.seq,
      sql`greatest(coalesce(${taskRead.lastReadSeq}, 0), ${sql.raw(String(Math.trunc(cleared)))})`
    )
  )

export interface InboxItem {
  task: { id: string; number: number; title: string; statusKey: string }
  /** Unread changes on the task. */
  unread: number
  /** The newest unread changes, newest first (up to `perTask`). */
  events: TaskEvent[]
  latestAt: Date
}

/**
 * Unread state: a task is unread when an agent or sync changed it after the
 * user last opened it (or after "mark all read"). The user's own changes
 * never count.
 */
export function createInboxService(db: Database) {
  async function clearedSeq(userId: string): Promise<number> {
    const row = await db.query.inboxState.findFirst({
      where: eq(inboxState.userId, userId),
    })
    return row?.clearedSeq ?? 0
  }

  /** Per-task unread counts and newest unread seq, newest first. */
  async function unreadTasks(userId: string, taskIds?: string[]) {
    const cleared = await clearedSeq(userId)
    return db
      .select({
        taskId: taskEvent.taskId,
        unread: count(),
        latestSeq: max(taskEvent.seq),
        latestAt: max(taskEvent.at),
      })
      .from(taskEvent)
      .innerJoin(
        task,
        and(eq(task.id, taskEvent.taskId), isNull(task.deletedAt))
      )
      .leftJoin(taskRead, readPosition)
      .where(
        and(
          unseenBy(userId, cleared),
          taskIds ? inArray(taskEvent.taskId, taskIds) : undefined
        )
      )
      .groupBy(taskEvent.taskId)
      .orderBy(desc(max(taskEvent.seq)))
  }

  async function latestSeq(userId: string, taskId?: string) {
    const [row] = await db
      .select({ seq: max(taskEvent.seq) })
      .from(taskEvent)
      .where(
        and(
          eq(taskEvent.userId, userId),
          taskId ? eq(taskEvent.taskId, taskId) : undefined
        )
      )
    return row?.seq ?? 0
  }

  return {
    /** How many tasks have unread changes (the nav badge). */
    async count(userId: string): Promise<number> {
      return (await unreadTasks(userId)).length
    },

    /** Which of these tasks (or all) have unread changes. */
    async unreadTaskIds(
      userId: string,
      taskIds?: string[]
    ): Promise<Set<string>> {
      if (taskIds?.length === 0) return new Set()
      return new Set((await unreadTasks(userId, taskIds)).map((r) => r.taskId))
    },

    /** Unread tasks with their newest unread changes, newest first. */
    async list(
      userId: string,
      { limit = 50, perTask = 5 } = {}
    ): Promise<InboxItem[]> {
      const rows = (await unreadTasks(userId)).slice(0, limit)
      if (rows.length === 0) return []
      const ids = rows.map((r) => r.taskId)
      const [tasks, events] = await Promise.all([
        db
          .select({
            id: task.id,
            number: task.number,
            title: task.title,
            statusKey: task.statusKey,
          })
          .from(task)
          .where(inArray(task.id, ids)),
        unreadEvents(userId, ids),
      ])
      return rows.map((row) => ({
        task: tasks.find((t) => t.id === row.taskId)!,
        unread: row.unread,
        events: events.filter((e) => e.taskId === row.taskId).slice(0, perTask),
        latestAt: row.latestAt!,
      }))
    },

    /** The user has seen this task as it is now. */
    async markRead(userId: string, taskId: string): Promise<void> {
      const seq = await latestSeq(userId, taskId)
      await db
        .insert(taskRead)
        .values({ userId, taskId, lastReadSeq: seq })
        .onConflictDoUpdate({
          target: [taskRead.userId, taskRead.taskId],
          set: { lastReadSeq: seq, readAt: new Date() },
        })
    },

    /** Everything so far counts as seen. */
    async markAllRead(userId: string): Promise<void> {
      const seq = await latestSeq(userId)
      await db
        .insert(inboxState)
        .values({ userId, clearedSeq: seq })
        .onConflictDoUpdate({
          target: inboxState.userId,
          set: { clearedSeq: seq, clearedAt: new Date() },
        })
    },
  }

  async function unreadEvents(userId: string, taskIds: string[]) {
    const cleared = await clearedSeq(userId)
    const rows = await db
      .select({ event: taskEvent })
      .from(taskEvent)
      .leftJoin(taskRead, readPosition)
      .where(and(unseenBy(userId, cleared), inArray(taskEvent.taskId, taskIds)))
      .orderBy(desc(taskEvent.seq))
    return rows.map(({ event }) => toEvent(event))
  }
}
