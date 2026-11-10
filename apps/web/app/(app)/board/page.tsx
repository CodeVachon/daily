import { services } from "@workspace/db"

import { KanbanBoard } from "@/components/board/kanban-board"
import { PageHeader } from "@/components/page-header"
import { NewTaskDialog } from "@/components/task/new-task-dialog"
import { boardItems, groupByStatus, toBoardCard } from "@/lib/board"
import { requireSession } from "@/lib/session"
import { loadTaskOptions } from "@/lib/task-options"

export const metadata = { title: "Board · Daily" }

export default async function BoardPage() {
  const { user } = await requireSession()
  const [options, { tasks }] = await Promise.all([
    loadTaskOptions(user.id),
    services.tasks.list(user.id, { limit: 200 }),
  ])
  const columns = groupByStatus(options.statuses, tasks)
  const now = new Date()
  const cards = Object.fromEntries(
    tasks.map((task) => [task.id, toBoardCard(task, now, options.timezone)])
  )
  const version = tasks
    .map((t) => `${t.id}:${t.status.key}:${t.boardPosition}:${+t.updatedAt}`)
    .join("|")

  return (
    <>
      <PageHeader title="Board">
        <NewTaskDialog options={options} />
      </PageHeader>
      <KanbanBoard
        version={version}
        columns={columns.map(({ status }) => ({
          key: status.key,
          name: status.name,
        }))}
        cards={cards}
        initialItems={boardItems(columns)}
      />
    </>
  )
}
