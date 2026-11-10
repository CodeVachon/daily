import "server-only"

import { services } from "@workspace/db"
import { NotFoundError } from "@workspace/db/core"

import { toTimeline } from "./activity"
import { toCommentView } from "./comments"
import { toLinkView } from "./links"
import { loadTaskOptions } from "./task-options"

/**
 * Everything the task view shows (page and drawer). Null when the task doesn't
 * exist for this user, e.g. a stale ?task= link.
 */
export async function loadTaskDetail(userId: string, ref: string) {
  const task = await services.tasks.get(userId, ref).catch((error: unknown) => {
    if (error instanceof NotFoundError) return null
    throw error
  })
  if (!task) return null
  const [options, events, checklist, comments, dependencies, links] =
    await Promise.all([
      loadTaskOptions(userId),
      services.activity.forTask(userId, task.id, 50),
      services.checklist.list(userId, task.id),
      services.comments.list(userId, task.id),
      services.dependencies.list(userId, task.id),
      services.links.list(userId, task.id),
    ])
  const now = new Date()
  return {
    task,
    options,
    timeline: toTimeline(events, {
      now,
      timezone: options.timezone,
      statusNames: Object.fromEntries(
        options.statuses.map((s) => [s.key, s.name])
      ),
    }),
    checklist: checklist.map(({ id, text, done }) => ({ id, text, done })),
    subtasks: task.subtasks.map(({ id, number, title, status }) => ({
      id,
      number,
      title,
      status: { name: status.name, category: status.category },
    })),
    blockedBy: dependencies.blockedBy.map(({ id, number, title, open }) => ({
      id,
      number,
      title,
      open,
    })),
    comments: comments.map((c) => toCommentView(c, userId, now)),
    links: links.map(toLinkView),
  }
}

export type TaskDetailData = NonNullable<
  Awaited<ReturnType<typeof loadTaskDetail>>
>
