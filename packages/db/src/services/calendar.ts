import {
  and,
  eq,
  getTableColumns,
  inArray,
  isNotNull,
  notInArray,
  sql,
} from "drizzle-orm"

import type { CalendarSyncBatch } from "../calendar-inputs"
import { CALENDAR_FULL_SYNC_DAYS } from "../sync-policy"
import { CALENDAR_CHANNEL } from "../changes"
import type { Database } from "../database"
import {
  calendarEvent,
  calendarSyncState,
  integrationConnection,
} from "../schema"

/** One selected calendar of a connected user, and where its sync resumes. */
export interface CalendarSyncTarget {
  userId: string
  calendarId: string
  syncToken: string | null
}

/** Rows per insert: well under Postgres' parameter limit. */
const CHUNK = 500

/** Columns refreshed from the provider on every upsert. */
const REMOTE_COLUMNS = Object.keys(getTableColumns(calendarEvent)).filter(
  (c) => !["id", "userId", "calendarId", "externalId"].includes(c)
) as (keyof typeof calendarEvent.$inferInsert)[]

/** remoteUpdatedAt → excluded."remote_updated_at" (the db is snake_case). */
const fromExcluded = Object.fromEntries(
  REMOTE_COLUMNS.map((c) => [
    c,
    sql.raw(`excluded."${c.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)}"`),
  ])
)

const DAY_MS = 86_400_000

/** "user\ncalendar": one key per (user, calendar) pair. */
const pairKey = (userId: string, calendarId: string) =>
  `${userId}\n${calendarId}`

export function createCalendarService(db: Database) {
  async function saveState(
    userId: string,
    calendarId: string,
    values: Partial<typeof calendarSyncState.$inferInsert>,
    tx: Pick<Database, "insert"> = db
  ) {
    await tx
      .insert(calendarSyncState)
      .values({ userId, calendarId, ...values })
      .onConflictDoUpdate({
        target: [calendarSyncState.userId, calendarSyncState.calendarId],
        set: values,
      })
  }

  return {
    /**
     * Every selected calendar of every user with a live Google connection,
     * with its sync token: null when a full sync is due (never synced, or
     * the last full one is a week old).
     */
    async syncTargets(now = new Date()): Promise<CalendarSyncTarget[]> {
      const fullBefore = now.getTime() - CALENDAR_FULL_SYNC_DAYS * DAY_MS
      const connections = await db.query.integrationConnection.findMany({
        where: and(
          eq(integrationConnection.provider, "google"),
          isNotNull(integrationConnection.credentialsEnc)
        ),
        with: { resources: true },
      })
      const tokens = new Map(
        (await db.select().from(calendarSyncState)).map((s) => [
          pairKey(s.userId, s.calendarId),
          (s.fullSyncedAt?.getTime() ?? 0) > fullBefore ? s.syncToken : null,
        ])
      )
      return connections.flatMap((c) =>
        c.resources.map((r) => ({
          userId: c.userId,
          calendarId: r.externalId,
          syncToken: tokens.get(pairKey(c.userId, r.externalId)) ?? null,
        }))
      )
    },

    /**
     * Forget calendars that are no longer synced (deselected, or Google
     * disconnected): their events and sync state. Returns events removed.
     */
    async retainOnly(targets: CalendarSyncTarget[]): Promise<number> {
      const keep = targets.map((t) => pairKey(t.userId, t.calendarId))
      const pair = (table: typeof calendarEvent | typeof calendarSyncState) =>
        sql`${table.userId} || chr(10) || ${table.calendarId}`
      await db
        .delete(calendarSyncState)
        .where(notInArray(pair(calendarSyncState), keep))
      const removed = await db
        .delete(calendarEvent)
        .where(notInArray(pair(calendarEvent), keep))
        .returning({ id: calendarEvent.id })
      return removed.length
    },

    /**
     * Store one calendar's changes and where to resume. Open pages hear
     * about it (calendar_changes) when anything changed. Returns how many
     * events were added, changed or removed.
     */
    async applySync(
      userId: string,
      calendarId: string,
      batch: CalendarSyncBatch,
      now = new Date()
    ): Promise<number> {
      return db.transaction(async (tx) => {
        const scope = and(
          eq(calendarEvent.userId, userId),
          eq(calendarEvent.calendarId, calendarId)
        )
        let changed = 0
        if (batch.full)
          changed += (
            await tx
              .delete(calendarEvent)
              .where(scope)
              .returning({ id: calendarEvent.id })
          ).length
        for (let i = 0; i < batch.upserts.length; i += CHUNK) {
          const rows = batch.upserts
            .slice(i, i + CHUNK)
            .map((e) => ({ ...e, userId, calendarId, syncedAt: now }))
          await tx
            .insert(calendarEvent)
            .values(rows)
            .onConflictDoUpdate({
              target: [
                calendarEvent.userId,
                calendarEvent.calendarId,
                calendarEvent.externalId,
              ],
              set: fromExcluded,
            })
        }
        changed += batch.upserts.length
        if (batch.deletes.length > 0)
          changed += (
            await tx
              .delete(calendarEvent)
              .where(
                and(scope, inArray(calendarEvent.externalId, batch.deletes))
              )
              .returning({ id: calendarEvent.id })
          ).length
        await saveState(
          userId,
          calendarId,
          {
            syncToken: batch.nextSyncToken,
            lastSyncedAt: now,
            lastError: null,
            ...(batch.full ? { fullSyncedAt: now } : {}),
          },
          tx
        )
        if (changed > 0)
          await tx.execute(
            sql`select pg_notify(${CALENDAR_CHANNEL}, ${JSON.stringify({ userId })})`
          )
        return changed
      })
    },

    /** The last sync of a calendar failed; keep its token for next time. */
    async recordSyncError(userId: string, calendarId: string, error: string) {
      await saveState(userId, calendarId, { lastError: error })
    },

    /** How each of the user's calendars last synced. */
    async syncStatus(userId: string) {
      return db
        .select({
          calendarId: calendarSyncState.calendarId,
          lastSyncedAt: calendarSyncState.lastSyncedAt,
          lastError: calendarSyncState.lastError,
        })
        .from(calendarSyncState)
        .where(eq(calendarSyncState.userId, userId))
    },
  }
}
