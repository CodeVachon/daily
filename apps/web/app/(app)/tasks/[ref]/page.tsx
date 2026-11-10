import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { TaskDetailView } from "@/components/task/task-detail-view"
import { requireSession } from "@/lib/session"
import { loadTaskDetail } from "@/lib/task-detail"

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
  const data = await loadTaskDetail(user.id, (await params).ref)
  if (!data) notFound()

  return (
    <>
      <PageHeader title={`#${data.task.number}`}>
        <span className="text-xs text-muted-foreground">
          Created by {data.task.createdBy.label} · updated by{" "}
          {data.task.updatedBy.label}
        </span>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-6">
        <TaskDetailView data={data} />
      </div>
    </>
  )
}
