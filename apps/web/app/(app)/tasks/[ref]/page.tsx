import { services } from "@workspace/db"
import { NotFoundError } from "@workspace/db/core"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { ActivityTimeline } from "@/components/task/activity-timeline"
import { ChecklistSection } from "@/components/task/checklist-section"
import { CommentsSection } from "@/components/task/comments-section"
import { DependenciesSection } from "@/components/task/dependencies-section"
import { SubtasksSection } from "@/components/task/subtasks-section"
import { TaskEditor } from "@/components/task/task-editor"
import { toTimeline } from "@/lib/activity"
import { toCommentView } from "@/lib/comments"
import { requireSession } from "@/lib/session"
import { loadTaskOptions } from "@/lib/task-options"

async function loadTask(userId: string, ref: string) {
  try {
    return await services.tasks.get(userId, ref)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  return { title: `#${(await params).ref} · Daily` }
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { user } = await requireSession()
  const { ref } = await params
  const [task, options] = await Promise.all([
    loadTask(user.id, ref),
    loadTaskOptions(user.id),
  ])
  const [events, checklist, comments, dependencies] = await Promise.all([
    services.activity.forTask(user.id, task.id, 50),
    services.checklist.list(user.id, task.id),
    services.comments.list(user.id, task.id),
    services.dependencies.list(user.id, task.id),
  ])
  const now = new Date()
  const timeline = toTimeline(events, {
    now,
    timezone: options.timezone,
    statusNames: Object.fromEntries(
      options.statuses.map((s) => [s.key, s.name])
    ),
  })

  return (
    <>
      <PageHeader title={`#${task.number}`}>
        <span className="text-xs text-muted-foreground">
          Created by {task.createdBy.label} · updated by {task.updatedBy.label}
        </span>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-6">
        <TaskEditor
          key={task.updatedAt.toISOString()}
          task={task}
          options={options}
        />
        <div className="mt-8 grid max-w-2xl gap-8">
          <ChecklistSection
            taskId={task.id}
            items={checklist.map(({ id, text, done }) => ({ id, text, done }))}
          />
          <SubtasksSection
            taskId={task.id}
            subtasks={task.subtasks.map(({ id, number, title, status }) => ({
              id,
              number,
              title,
              status: { name: status.name, category: status.category },
            }))}
          />
          <DependenciesSection
            taskId={task.id}
            blockedBy={dependencies.blockedBy.map(
              ({ id, number, title, open }) => ({ id, number, title, open })
            )}
          />
          <CommentsSection
            taskId={task.id}
            comments={comments.map((c) => toCommentView(c, user.id, now))}
          />
          <ActivityTimeline entries={timeline} />
        </div>
      </div>
    </>
  )
}
