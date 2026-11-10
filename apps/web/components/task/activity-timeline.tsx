import type { ActorType } from "@workspace/db/core"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { BotIcon, RefreshCwIcon } from "lucide-react"

import type { TimelineEntry } from "@/lib/activity"
import { initials } from "@/lib/initials"

function ActorAvatar({ type, name }: { type: ActorType; name: string }) {
  const icon = {
    agent: <BotIcon />,
    system: <RefreshCwIcon />,
    user: initials(name),
  }[type]
  return (
    <Avatar
      className="size-6 text-[10px] [&_svg]:size-3.5"
      aria-label={`${name} (${type})`}
    >
      <AvatarFallback
        className={type === "agent" ? "bg-primary/10 text-primary" : undefined}
      >
        {icon}
      </AvatarFallback>
    </Avatar>
  )
}

/** Who changed what, newest first: the user, agents (by name) and sync. */
export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Activity</h2>
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2 text-sm">
            <ActorAvatar type={entry.actorType} name={entry.actorName} />
            <p className="min-w-0 flex-1 text-muted-foreground">
              <span className="font-medium text-foreground">
                {entry.actorName}
              </span>{" "}
              {entry.text}
            </p>
            <Tooltip>
              <TooltipTrigger
                render={
                  <time className="shrink-0 text-xs text-muted-foreground" />
                }
              >
                {entry.relative}
              </TooltipTrigger>
              <TooltipContent>{entry.exact}</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ol>
    </section>
  )
}
