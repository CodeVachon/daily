import { services } from "@workspace/db"
import type { TaskSummary } from "@workspace/db/core"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import Link from "next/link"

import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { NewTaskDialog } from "@/components/task/new-task-dialog"
import { relativeTime } from "@/lib/activity"
import { toBoardCard } from "@/lib/board"
import { parseFilters, toListInput } from "@/lib/filters"
import { requireSession } from "@/lib/session"
import { PRIORITY_OPTIONS, taskHref } from "@/lib/task-form"
import { loadTaskOptions } from "@/lib/task-options"

export const metadata = { title: "Tasks · Daily" }

/** Priority column text; blank for "no priority" to keep the table quiet. */
const priorityLabel: Record<string, string> = {
  ...Object.fromEntries(PRIORITY_OPTIONS.map((p) => [p.value, p.label])),
  none: "",
}

function TaskRow({
  task,
  now,
  timezone,
}: {
  task: TaskSummary
  now: Date
  timezone: string
}) {
  const card = toBoardCard(task, now, timezone)
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">#{task.number}</TableCell>
      <TableCell className="max-w-md truncate">
        <Link href={taskHref(task.number)} className="hover:underline">
          {task.title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{task.status.name}</Badge>
      </TableCell>
      <TableCell>{priorityLabel[task.priority]}</TableCell>
      <TableCell className={card.due?.overdue ? "text-destructive" : undefined}>
        {card.due?.label}
      </TableCell>
      <TableCell>{card.project}</TableCell>
      <TableCell className="space-x-1">
        {card.labels.map((label) => (
          <Badge key={label} variant="secondary">
            {label}
          </Badge>
        ))}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {relativeTime(task.updatedAt, now)}
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
  const filters = parseFilters(await searchParams)
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
                task={task}
                now={now}
                timezone={options.timezone}
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
    </>
  )
}
