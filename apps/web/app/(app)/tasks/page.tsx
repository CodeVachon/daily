import { services } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import { ColorBadge } from "@/components/color-badge"
import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { NewTaskDialog } from "@/components/task/new-task-dialog"
import { TaskDrawerSlot } from "@/components/task/task-drawer-slot"
import type { Chip } from "@/lib/board"
import { drawerHref, drawerTask, searchWithoutDrawer } from "@/lib/drawer"
import { parseFilters, toListInput } from "@/lib/filters"
import { requireSession } from "@/lib/session"
import { toTaskRow, type TaskRowView } from "@/lib/task-list"
import { loadTaskOptions } from "@/lib/task-options"

export const metadata = { title: "Tasks · Daily" }

function ChipsCell({
  chips,
  fallback,
}: {
  chips: Chip[]
  fallback?: "outline" | "secondary"
}) {
  return (
    <TableCell className="space-x-1">
      {chips.map((chip) => (
        <ColorBadge key={chip.name} chip={chip} fallback={fallback} />
      ))}
    </TableCell>
  )
}

function TaskRow({ row, href }: { row: TaskRowView; href: string }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">#{row.number}</TableCell>
      <TableCell className="max-w-md truncate">
        <Link href={href} scroll={false} className="hover:underline">
          {row.title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{row.status}</Badge>
      </TableCell>
      <TableCell>{row.priority}</TableCell>
      <TableCell className={cn(row.overdue && "text-destructive")}>
        {row.due}
      </TableCell>
      <ChipsCell chips={row.projects} fallback="secondary" />
      <ChipsCell chips={row.labels} />
      <TableCell className="text-right text-muted-foreground">
        {row.updated}
      </TableCell>
    </TableRow>
  )
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { user } = await requireSession()
  const params = await searchParams
  const filters = parseFilters(params)
  const search = searchWithoutDrawer(params)
  const [options, { tasks, hasMore }] = await Promise.all([
    loadTaskOptions(user.id),
    services.tasks.list(user.id, toListInput(filters)),
  ])
  const now = new Date()

  return (
    <>
      <PageHeader title="Tasks">
        <NewTaskDialog options={options} />
      </PageHeader>
      <FilterBar filters={filters} options={options} sortable />
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                row={toTaskRow(task, now, options.timezone)}
                href={drawerHref("/tasks", search, task.number)}
              />
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No tasks match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <p className="mt-3 text-sm text-muted-foreground">
            Showing the first 200 tasks; narrow the filters to see more.
          </p>
        )}
      </div>
      <TaskDrawerSlot
        userId={user.id}
        taskRef={drawerTask(params)}
        pathname="/tasks"
        search={search}
      />
    </>
  )
}
