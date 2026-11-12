import { services } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { InboxIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { ActivityTimeline } from "@/components/task/activity-timeline"
import { TaskDrawerSlot } from "@/components/task/task-drawer-slot"
import {
  MarkAllReadButton,
  MarkReadButton,
} from "@/components/updates/inbox-actions"
import { Invitations } from "@/components/updates/invitations"
import { drawerHref, drawerTask, searchWithoutDrawer } from "@/lib/drawer"
import { requireSession } from "@/lib/session"
import { invitationViews } from "@/lib/meeting"
import { loadTaskOptions } from "@/lib/task-options"
import { toUpdates, type UpdateView } from "@/lib/updates"

export const metadata = { title: "Updates · Daily" }

function UpdateCard({ update, href }: { update: UpdateView; href: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Link href={href} scroll={false} className="hover:underline">
            <span className="text-muted-foreground">#{update.number}</span>{" "}
            {update.title}
          </Link>
          <Badge variant="outline">{update.status}</Badge>
        </CardTitle>
        <CardDescription>
          {update.unread} unread {update.unread === 1 ? "change" : "changes"}
        </CardDescription>
        <CardAction>
          <MarkReadButton taskId={update.taskId} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ActivityTimeline entries={update.entries} title={null} />
        {update.more > 0 && (
          <Link
            href={href}
            scroll={false}
            className="text-xs text-muted-foreground hover:underline"
          >
            and {update.more} more…
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * What needs you: meeting invitations to answer, then what agents and sync
 * changed since you last looked, by task.
 */
export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { user } = await requireSession()
  const params = await searchParams
  const search = searchWithoutDrawer(params)
  const [items, options, invitations] = await Promise.all([
    services.inbox.list(user.id),
    loadTaskOptions(user.id),
    services.calendar.invitations(user.id),
  ])
  const updates = toUpdates(items, {
    now: new Date(),
    timezone: options.timezone,
    statusNames: Object.fromEntries(
      options.statuses.map((s) => [s.key, s.name])
    ),
  })

  return (
    <>
      <PageHeader title="Updates">
        {updates.length > 0 && <MarkAllReadButton />}
      </PageHeader>
      <div className="flex max-w-3xl flex-col gap-3 p-4">
        <Invitations items={invitationViews(invitations, options.timezone)} />
        {updates.map((update) => (
          <UpdateCard
            key={update.taskId}
            update={update}
            href={drawerHref("/updates", search, update.number)}
          />
        ))}
        {updates.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <InboxIcon className="size-8" />
            <p>All caught up. Changes by agents and sync will show up here.</p>
          </div>
        )}
      </div>
      <TaskDrawerSlot
        userId={user.id}
        taskRef={drawerTask(params)}
        pathname="/updates"
        search={search}
      />
    </>
  )
}
