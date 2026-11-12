import { and, asc, desc, eq, gt, inArray, ne, or, isNull } from "drizzle-orm"

import type { Actor, ActorType } from "../actor"
import type { Database } from "../database"
import type { TaskEvent, TaskEventPayload } from "../events"
import { taskEvent } from "../schema"

/** A database or an open transaction: anything that can insert. */
type Executor = Pick<Database, "insert">

/**
 * Append events for a change. Call with the transaction that makes the change
 * so history and data commit (or roll back) together.
 */
export async function recordEvents(
  tx: Executor,
  actor: Actor,
  taskId: string,
  payloads: TaskEventPayload[]
): Promise<void> {
  if (payloads.length === 0) return
  await tx.insert(taskEvent).values(
    payloads.map((payload) => ({
      taskId,
      userId: actor.userId,
      actorType: actor.type,
      actorUserId: actor.userId,
      actorClientId: actor.clientId,
      actorLabel: actor.label,
      type: payload.type,
      payload,
    }))
  )
}

type Row = typeof taskEvent.$inferSelect

export function toEvent(row: Row): TaskEvent {
  return {
    seq: row.seq,
    taskId: row.taskId,
    at: row.at,
    actor: {
      type: row.actorType,
      userId: row.actorUserId,
      clientId: row.actorClientId,
      label: row.actorLabel,
    },
    payload: row.payload,
  }
}

export interface ActivityPage {
  events: TaskEvent[]
  /** Pass back as `after` to get the next page; null when caught up. */
  nextCursor: number | null
}

export interface SinceOptions {
  /** Return events with seq greater than this (exclusive). */
  after?: number
  /** Only these actor types (e.g. ["agent", "system"] for the inbox). */
  actorTypes?: ActorType[]
  /** Skip events made by this OAuth client (an agent catching up on others' changes). */
  excludeClientId?: string
  limit?: number
}

export function createActivityService(db: Database) {
  return {
    /** A task's timeline, newest first. */
    async forTask(
      userId: string,
      taskId: string,
      limit = 100
    ): Promise<TaskEvent[]> {
      const rows = await db
        .select()
        .from(taskEvent)
        .where(and(eq(taskEvent.userId, userId), eq(taskEvent.taskId, taskId)))
        .orderBy(desc(taskEvent.seq))
        .limit(limit)
      return rows.map(toEvent)
    },

    /** Everything that changed since a cursor, oldest first. */
    async since(
      userId: string,
      options: SinceOptions = {}
    ): Promise<ActivityPage> {
      const limit = options.limit ?? 100
      const rows = await db
        .select()
        .from(taskEvent)
        .where(
          and(
            eq(taskEvent.userId, userId),
            options.after === undefined
              ? undefined
              : gt(taskEvent.seq, options.after),
            options.actorTypes
              ? inArray(taskEvent.actorType, options.actorTypes)
              : undefined,
            options.excludeClientId
              ? or(
                  isNull(taskEvent.actorClientId),
                  ne(taskEvent.actorClientId, options.excludeClientId)
                )
              : undefined
          )
        )
        .orderBy(asc(taskEvent.seq))
        .limit(limit + 1)
      const page = rows.slice(0, limit).map(toEvent)
      return {
        events: page,
        nextCursor: rows.length > limit ? (page.at(-1)?.seq ?? null) : null,
      }
    },
  }
}
