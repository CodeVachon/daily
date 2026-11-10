import { closeDrawerHref } from "@/lib/drawer"
import { loadTaskDetail } from "@/lib/task-detail"
import { taskHref } from "@/lib/task-form"

import { TaskDetailView } from "./task-detail-view"
import { TaskDrawer } from "./task-drawer"

/** Server part of the drawer: loads the task (if ?task= points at one) and renders the shared view. */
export async function TaskDrawerSlot({
  userId,
  taskRef,
  pathname,
  search,
}: {
  userId: string
  taskRef: string | null
  pathname: string
  search: string
}) {
  const data = taskRef ? await loadTaskDetail(userId, taskRef) : null
  if (!data) return null
  const { task } = data
  return (
    <TaskDrawer
      number={task.number}
      title={task.title}
      meta={`Created by ${task.createdBy.label} · updated by ${task.updatedBy.label}`}
      pageHref={taskHref(task.number)}
      closeHref={closeDrawerHref(pathname, search)}
    >
      <TaskDetailView data={data} />
    </TaskDrawer>
  )
}
