import { services } from "@workspace/db"
import { NotFoundError } from "@workspace/db/core"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { TaskEditor } from "@/components/task/task-editor"
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
      </div>
    </>
  )
}
