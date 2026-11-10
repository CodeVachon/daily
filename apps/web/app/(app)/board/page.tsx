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
import { groupByStatus } from "@/lib/board"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Board · Daily" }

export default async function BoardPage() {
  const { user } = await requireSession()
  const [statuses, { tasks }, timezone] = await Promise.all([
    services.tasks.statuses(),
    services.tasks.list(user.id, { limit: 200 }),
    services.settings.getTimezone(user.id),
  ])
  const columns = groupByStatus(statuses, tasks)

  return (
    <>
      <PageHeader title="Board" />
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
              <Card key={task.id} size="sm">
                <CardHeader>
                  <CardTitle className="text-sm">
                    <span className="text-muted-foreground">
                      #{task.number}
                    </span>{" "}
                    {task.title}
                  </CardTitle>
                  {task.due && (
                    <CardDescription>
                      Due {formatDue(task.due, timezone)}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
