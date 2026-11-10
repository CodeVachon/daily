import { services } from "@workspace/db"

import { KanbanBoard } from "@/components/board/kanban-board"
import { PageHeader } from "@/components/page-header"
import { NewTaskDialog } from "@/components/task/new-task-dialog"
import { FilterBar } from "@/components/filter-bar"
import { boardItems, groupByStatus, toBoardCard } from "@/lib/board"
import { parseFilters, toListInput } from "@/lib/filters"
import { requireSession } from "@/lib/session"
import { loadTaskOptions } from "@/lib/task-options"

export const metadata = { title: "Board · Daily" }

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { user } = await requireSession()
  const filters = parseFilters(await searchParams)
  const [options, { tasks }] = await Promise.all([
    loadTaskOptions(user.id),
    services.tasks.list(user.id, { ...toListInput(filters), orderBy: "board" }),
  ])
  const columns = groupByStatus(options.statuses, tasks, {
    showCancelled: filters.cancelled,
  })
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
      <FilterBar filters={filters} options={options} />
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
