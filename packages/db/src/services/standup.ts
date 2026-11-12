import { desc, eq } from "drizzle-orm"

import type { Actor } from "../actor"
import type { Database } from "../database"
import { ValidationError } from "../errors"
import { MEETING_LABEL } from "../meeting-tasks"
import { standupPost } from "../schema"
import {
  defaultSince,
  formatStandup,
  standupSection,
  STANDUP_SECTIONS,
  type StandupSections,
} from "../standup"
import type { ListTasksInput } from "../task-inputs"
import type { createDependencyService } from "./dependencies"
import type { createLinkService } from "./links"
import type { createSettingsService } from "./settings"
import type { createTaskService, TaskSummary } from "./tasks"

interface Deps {
  tasks: ReturnType<typeof createTaskService>
  links: ReturnType<typeof createLinkService>
  dependencies: ReturnType<typeof createDependencyService>
  settings: ReturnType<typeof createSettingsService>
}

export interface StandupDraft {
  /** The window it covers: [since, until). */
  since: Date
  until: Date
  timezone: string
  sections: StandupSections
  markdown: string
  slack: string
}

export interface StandupPost {
  id: string
  postedAt: Date
  channel: string | null
  body: string
  postedBy: Actor
}

const PAGE = 200
/** Stop paging past this many tasks (single-user scale). */
const MAX_TASKS = 5_000

/**
 * The standup draft (motte #44): what I finished since the last standup,
 * what's in progress, what's blocked and what's up next, with each task's
 * links. Meeting tasks are left out: they're the calendar, not the work.
 */
export function createStandupService(db: Database, deps: Deps) {
  /** Every task matching `filters`, page by page, until `enough` says stop. */
  async function collect(
    userId: string,
    filters: ListTasksInput,
    now: Date,
    enough: (page: TaskSummary[]) => boolean = () => false
  ): Promise<TaskSummary[]> {
    const found: TaskSummary[] = []
    for (let offset = 0; offset < MAX_TASKS; offset += PAGE) {
      const { tasks, hasMore } = await deps.tasks.list(
        userId,
        { ...filters, limit: PAGE, offset },
        now
      )
      found.push(...tasks)
      if (!hasMore || enough(tasks)) break
    }
    return found
  }

  async function lastPostedAt(userId: string): Promise<Date | null> {
    const [last] = await db
      .select({ postedAt: standupPost.postedAt })
      .from(standupPost)
      .where(eq(standupPost.userId, userId))
      .orderBy(desc(standupPost.postedAt))
      .limit(1)
    return last?.postedAt ?? null
  }

  /** Done tasks, most recently updated first, back to `since`. */
  const recentlyDone = (userId: string, since: Date, now: Date) =>
    collect(userId, { status: ["done"], orderBy: "updated" }, now, (page) =>
      page.some((t) => t.updatedAt < since)
    )

  async function blockersOf(userId: string, t: TaskSummary) {
    if (t.openBlockers === 0) return []
    const { blockedBy } = await deps.dependencies.list(userId, t.id)
    return blockedBy
      .filter((b) => b.open)
      .map(({ number, title }) => ({ number, title }))
  }

  return {
    async draft(
      userId: string,
      options: { since?: Date; now?: Date } = {}
    ): Promise<StandupDraft> {
      const now = options.now ?? new Date()
      const timezone = await deps.settings.getTimezone(userId)
      const since =
        options.since ?? defaultSince(now, timezone, await lastPostedAt(userId))
      if (options.since && since >= now) {
        throw new ValidationError("A standup's start has to be in the past")
      }
      const window = { since, now, timezone }
      const candidates = [
        ...(await recentlyDone(userId, since, now)),
        ...(await collect(userId, { status: ["open", "active"] }, now)),
      ].filter((t) => !t.labels.some((l) => l.name === MEETING_LABEL))
      const placed = candidates
        .map((t) => ({
          t,
          section: standupSection(
            {
              statusKey: t.status.key,
              category: t.status.category,
              completedAt: t.completedAt,
              due: t.due,
              openBlockers: t.openBlockers,
            },
            window
          ),
        }))
        .filter((p) => p.section !== null)
      const chips = await deps.links.chipsForTasks(
        userId,
        placed.map((p) => p.t.id)
      )
      const sections = Object.fromEntries(
        STANDUP_SECTIONS.map((key) => [key, []])
      ) as unknown as StandupSections
      for (const { t, section } of placed) {
        sections[section!].push({
          number: t.number,
          title: t.title,
          due: t.due,
          links: (chips[t.id] ?? []).map(({ key, url, state }) => ({
            key,
            url,
            state,
          })),
          blockedBy: await blockersOf(userId, t),
        })
      }
      return {
        since,
        until: now,
        timezone,
        sections,
        markdown: formatStandup(sections, "markdown", window),
        slack: formatStandup(sections, "slack", window),
      }
    },

    /** "I posted it": the next draft starts from here. */
    async record(
      actor: Actor,
      input: { body: string; channel?: string | null; postedAt?: Date }
    ): Promise<StandupPost> {
      const body = input.body.trim()
      if (!body) throw new ValidationError("A standup needs a body")
      const [row] = await db
        .insert(standupPost)
        .values({
          userId: actor.userId,
          body,
          channel: input.channel?.trim() || null,
          postedAt: input.postedAt ?? new Date(),
          postedBy: actor,
        })
        .returning()
      const { userId: _, ...post } = row!
      return post
    },

    /** Standups I've posted, newest first. */
    async history(userId: string, limit = 20): Promise<StandupPost[]> {
      return db
        .select({
          id: standupPost.id,
          postedAt: standupPost.postedAt,
          channel: standupPost.channel,
          body: standupPost.body,
          postedBy: standupPost.postedBy,
        })
        .from(standupPost)
        .where(eq(standupPost.userId, userId))
        .orderBy(desc(standupPost.postedAt))
        .limit(limit)
    },
  }
}
