import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm"

import { assertCanDelete, systemActor, type Actor } from "../actor"
import type { Database } from "../database"
import { NotFoundError, ValidationError } from "../errors"
import { diffFields, type FieldChange } from "../events"
import {
  isJiraKey,
  parseExternalRef,
  type LinkKind,
  type LinkStateCategory,
} from "../external-ref"
import type { IntegrationProvider } from "../integration-inputs"
import { task, taskLink } from "../schema"
import { SYNC_INTERVALS } from "../sync-policy"
import { recordEvents } from "./activity"
import type { createIntegrationService } from "./integrations"
import { createTaskService, type TaskRef } from "./tasks"

export interface TaskLink {
  id: string
  provider: IntegrationProvider
  kind: LinkKind
  key: string
  url: string
  /** Remote state; null until the first sync. */
  title: string | null
  state: string | null
  stateCategory: LinkStateCategory | null
  assignee: string | null
  remoteUpdatedAt: Date | null
  lastSyncedAt: Date | null
  syncError: string | null
  createdBy: Actor
  createdAt: Date
}

/** What a provider says about a linked item now. */
export interface RemoteState {
  kind: LinkKind
  title: string
  state: string
  stateCategory: LinkStateCategory
  assignee: string | null
  remoteUpdatedAt: Date | null
}

export type SyncResult =
  { ok: true; state: RemoteState } | { ok: false; error: string }

/** A link the sync worker should refresh now, and whose it is. */
export interface DueLink {
  userId: string
  linkId: string
  provider: IntegrationProvider
}

/** What a board card shows about a link. */
export interface LinkChip {
  provider: IntegrationProvider
  kind: LinkKind
  key: string
  state: string | null
  stateCategory: LinkStateCategory | null
}

// Seconds until a link is due again (see sync-policy.ts). Our own constants,
// so they're inlined rather than bound (Postgres can't type bound CASE values).
const seconds = (n: number) => sql.raw(String(Math.trunc(n)))
const intervalSeconds = sql`case
  when ${taskLink.syncError} is not null then ${seconds(SYNC_INTERVALS.failing)}
  when ${taskLink.stateCategory} in ('merged', 'done', 'closed') then ${seconds(SYNC_INTERVALS.settled)}
  else ${seconds(SYNC_INTERVALS.active)} end`

const toLink = ({
  taskId: _,
  userId: __,
  ...row
}: typeof taskLink.$inferSelect): TaskLink => row

export function createLinkService(
  db: Database,
  integrations: ReturnType<typeof createIntegrationService>
) {
  const tasks = createTaskService(db)

  async function parse(userId: string, input: string) {
    const jiraSite = isJiraKey(input)
      ? (await integrations.get(userId, "jira"))?.config.site
      : null
    const ref = parseExternalRef(input, { jiraSite })
    if (ref) return ref
    throw new ValidationError(
      isJiraKey(input)
        ? `Connect Jira in Settings > Integrations to link ${input.trim().toUpperCase()}, or paste its full URL`
        : "Not a GitHub issue/PR or Jira issue link (try a URL, owner/repo#12 or PROJ-42)"
    )
  }

  async function load(userId: string, linkId: string) {
    const row = await db.query.taskLink.findFirst({
      where: and(eq(taskLink.id, linkId), eq(taskLink.userId, userId)),
    })
    if (!row) throw new NotFoundError("Link")
    return row
  }

  return {
    /**
     * Links (every user's) whose last sync is older than their interval,
     * never-synced first, then the stalest. Links on deleted tasks are skipped.
     */
    async dueForSync({ now = new Date(), limit = 100 } = {}): Promise<
      DueLink[]
    > {
      return db
        .select({
          userId: taskLink.userId,
          linkId: taskLink.id,
          provider: taskLink.provider,
        })
        .from(taskLink)
        .innerJoin(task, eq(task.id, taskLink.taskId))
        .where(
          and(
            isNull(task.deletedAt),
            or(
              isNull(taskLink.lastSyncedAt),
              lt(
                taskLink.lastSyncedAt,
                sql`${now.toISOString()}::timestamptz - make_interval(secs => ${intervalSeconds})`
              )
            )
          )
        )
        .orderBy(sql`${taskLink.lastSyncedAt} asc nulls first`)
        .limit(limit)
    },

    /** Link chips per task id, for board cards. */
    async chipsForTasks(
      userId: string,
      taskIds: string[]
    ): Promise<Record<string, LinkChip[]>> {
      if (taskIds.length === 0) return {}
      const rows = await db
        .select({
          taskId: taskLink.taskId,
          provider: taskLink.provider,
          kind: taskLink.kind,
          key: taskLink.key,
          state: taskLink.state,
          stateCategory: taskLink.stateCategory,
        })
        .from(taskLink)
        .where(
          and(eq(taskLink.userId, userId), inArray(taskLink.taskId, taskIds))
        )
        .orderBy(asc(taskLink.createdAt))
      const chips: Record<string, LinkChip[]> = {}
      for (const { taskId, ...chip } of rows) (chips[taskId] ??= []).push(chip)
      return chips
    },

    /** One link. */
    async get(userId: string, linkId: string): Promise<TaskLink> {
      return toLink(await load(userId, linkId))
    },

    /** A task's links, oldest first. */
    async list(userId: string, taskRef: TaskRef): Promise<TaskLink[]> {
      const taskId = await tasks.resolveId(userId, taskRef)
      const rows = await db.query.taskLink.findMany({
        where: and(eq(taskLink.taskId, taskId), eq(taskLink.userId, userId)),
        orderBy: asc(taskLink.createdAt),
      })
      return rows.map(toLink)
    },

    /**
     * Link a GitHub issue/PR or Jira issue from a URL or shorthand. Linking
     * the same item twice returns the existing link.
     */
    async add(
      actor: Actor,
      taskRef: TaskRef,
      input: string
    ): Promise<TaskLink> {
      const taskId = await tasks.resolveId(actor.userId, taskRef)
      const ref = await parse(actor.userId, input)
      return db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(taskLink)
          .values({ taskId, userId: actor.userId, ...ref, createdBy: actor })
          .onConflictDoNothing()
          .returning()
        if (inserted) {
          await recordEvents(tx, actor, taskId, [
            { type: "link_added", linkId: inserted.id, url: ref.url },
          ])
          return toLink(inserted)
        }
        const existing = await tx.query.taskLink.findFirst({
          where: and(
            eq(taskLink.taskId, taskId),
            eq(taskLink.provider, ref.provider),
            eq(taskLink.key, ref.key)
          ),
        })
        return toLink(existing!)
      })
    },

    /**
     * Which tasks link to this item (URL or shorthand), e.g. to find the task
     * tracking owner/repo#12. Deleted tasks are left out.
     */
    async findTasks(
      userId: string,
      input: string
    ): Promise<{ number: number; title: string; linkId: string }[]> {
      const ref = await parse(userId, input)
      return db
        .select({ number: task.number, title: task.title, linkId: taskLink.id })
        .from(taskLink)
        .innerJoin(task, eq(task.id, taskLink.taskId))
        .where(
          and(
            eq(taskLink.userId, userId),
            eq(taskLink.provider, ref.provider),
            eq(taskLink.key, ref.key),
            isNull(task.deletedAt)
          )
        )
        .orderBy(asc(task.number))
    },

    /** User only, like every delete. */
    async remove(actor: Actor, linkId: string): Promise<void> {
      assertCanDelete(actor, "links")
      const row = await load(actor.userId, linkId)
      await db.transaction(async (tx) => {
        await tx.delete(taskLink).where(eq(taskLink.id, row.id))
        await recordEvents(tx, actor, row.taskId, [
          { type: "link_removed", linkId: row.id, url: row.url },
        ])
      })
    },

    /**
     * Store what the sync worker learned. Changes after the first sync go in
     * the task's history as the "sync" system actor; failures only set
     * `syncError`. Returns the changes recorded.
     */
    async recordSync(
      userId: string,
      linkId: string,
      result: SyncResult
    ): Promise<FieldChange[]> {
      const row = await load(userId, linkId)
      const now = new Date()
      if (!result.ok) {
        await db
          .update(taskLink)
          .set({ syncError: result.error, lastSyncedAt: now })
          .where(eq(taskLink.id, row.id))
        return []
      }
      const { remoteUpdatedAt, ...fields } = result.state
      const changes = row.lastSyncedAt ? diffFields(row, fields) : []
      await db.transaction(async (tx) => {
        await tx
          .update(taskLink)
          .set({
            ...fields,
            remoteUpdatedAt,
            lastSyncedAt: now,
            syncError: null,
          })
          .where(eq(taskLink.id, row.id))
        if (changes.length)
          await recordEvents(tx, systemActor(userId, "sync"), row.taskId, [
            { type: "link_synced", linkId: row.id, changes },
          ])
      })
      return changes
    },
  }
}
