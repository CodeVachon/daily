import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { services } from "@workspace/db"
import { formatDue } from "@workspace/db/time"

import { PageHeader } from "@/components/page-header"
import { NewTaskDialog } from "@/components/task/new-task-dialog"
import { groupByStatus } from "@/lib/board"
import { requireSession } from "@/lib/session"
import { taskHref } from "@/lib/task-form"
import { loadTaskOptions } from "@/lib/task-options"
import Link from "next/link"

export const metadata = { title: "Board · Daily" }

export default async function BoardPage() {
  const { user } = await requireSession()
  const [options, { tasks }] = await Promise.all([
    loadTaskOptions(user.id),
    services.tasks.list(user.id, { limit: 200 }),
  ])
  const columns = groupByStatus(options.statuses, tasks)

  return (
    <>
      <PageHeader title="Board">
        <NewTaskDialog options={options} />
      </PageHeader>
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map(({ status, tasks: columnTasks }) => (
          <section
            key={status.key}
            className="flex w-72 shrink-0 flex-col gap-2"
          >
            <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
              {status.name}
              <Badge variant="secondary">{columnTasks.length}</Badge>
            </h2>
            {columnTasks.map((task) => (
              <Link
                key={task.id}
                href={taskHref(task.number)}
                className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card size="sm" className="transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      <span className="text-muted-foreground">
                        #{task.number}
                      </span>{" "}
                      {task.title}
                    </CardTitle>
                    {task.due && (
                      <CardDescription>
                        Due {formatDue(task.due, options.timezone)}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
