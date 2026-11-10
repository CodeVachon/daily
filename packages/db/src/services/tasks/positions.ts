import { and, asc, desc, eq, gt, isNull, lt, ne } from "drizzle-orm"
import { generateKeyBetween } from "fractional-indexing"

import type { Database } from "../../database"
import { ValidationError } from "../../errors"
import { task } from "../../schema"

type Reader = Pick<Database, "select">

interface Column {
  userId: string
  statusKey: string
  /** The task being placed (excluded from neighbour lookups). */
  excludeTaskId?: string
}

function inColumn({ userId, statusKey, excludeTaskId }: Column) {
  return and(
    eq(task.userId, userId),
    eq(task.statusKey, statusKey),
    isNull(task.deletedAt),
    excludeTaskId ? ne(task.id, excludeTaskId) : undefined
  )
}

async function edgePosition(db: Reader, column: Column, last: boolean) {
  const [row] = await db
    .select({ position: task.boardPosition })
    .from(task)
    .where(inColumn(column))
    .orderBy(last ? desc(task.boardPosition) : asc(task.boardPosition))
    .limit(1)
  return row?.position ?? null
}

async function neighbourPosition(
  db: Reader,
  column: Column,
  of: string,
  above: boolean
) {
  const [row] = await db
    .select({ position: task.boardPosition })
    .from(task)
    .where(
      and(
        inColumn(column),
        above ? lt(task.boardPosition, of) : gt(task.boardPosition, of)
      )
    )
    .orderBy(above ? desc(task.boardPosition) : asc(task.boardPosition))
    .limit(1)
  return row?.position ?? null
}

async function positionOf(db: Reader, column: Column, taskId: string) {
  const [row] = await db
    .select({ position: task.boardPosition })
    .from(task)
    .where(and(inColumn(column), eq(task.id, taskId)))
  if (!row)
    throw new ValidationError("Neighbour task is not in the target column")
  return row.position
}

/** A position at the bottom of a status column. */
export async function positionAtEnd(
  db: Reader,
  column: Column
): Promise<string> {
  return generateKeyBetween(await edgePosition(db, column, true), null)
}

/**
 * A position between two neighbours in a column. Give the task above
 * (`afterTaskId`), below (`beforeTaskId`), both, or neither (bottom).
 */
export async function positionBetween(
  db: Reader,
  column: Column,
  neighbours: { afterTaskId?: string | null; beforeTaskId?: string | null }
): Promise<string> {
  const { afterTaskId, beforeTaskId } = neighbours
  if (!afterTaskId && !beforeTaskId) return positionAtEnd(db, column)
  const lower = afterTaskId ? await positionOf(db, column, afterTaskId) : null
  const upper = beforeTaskId ? await positionOf(db, column, beforeTaskId) : null
  if (lower !== null && upper !== null) {
    if (lower >= upper)
      throw new ValidationError("afterTaskId must be above beforeTaskId")
    return generateKeyBetween(lower, upper)
  }
  if (lower !== null)
    return generateKeyBetween(
      lower,
      await neighbourPosition(db, column, lower, false)
    )
  return generateKeyBetween(
    await neighbourPosition(db, column, upper!, true),
    upper
  )
}
