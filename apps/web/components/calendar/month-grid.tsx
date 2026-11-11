import type { CalendarEvent } from "@workspace/db/core"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import { calendarHref, type MonthCell } from "@/lib/calendar"
import { chipTime, meetingTone } from "@/lib/meeting"

import { TONE } from "./tone"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function Chip({
  event,
  href,
  timezone,
}: {
  event: CalendarEvent
  href: string
  timezone: string
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "block truncate rounded-sm px-1 py-px text-xs",
        TONE[meetingTone(event)]
      )}
    >
      <span className="opacity-70">{chipTime(event, timezone)}</span>{" "}
      {event.title}
    </Link>
  )
}

function Cell({
  cell,
  timezone,
  eventHref,
}: {
  cell: MonthCell
  timezone: string
  eventHref: (id: string) => string
}) {
  const { day } = cell
  const weekHref = calendarHref(day.date)
  return (
    <div
      className={cn(
        "flex min-h-28 min-w-0 flex-col gap-0.5 border-t border-l p-1",
        !day.inMonth && "bg-muted/40 text-muted-foreground"
      )}
    >
      <Link
        href={weekHref}
        aria-label={`Week of ${day.date}`}
        className={cn(
          "self-start rounded-full px-1.5 text-sm hover:bg-muted",
          day.isToday && "bg-primary text-primary-foreground hover:bg-primary"
        )}
      >
        {day.day}
      </Link>
      {cell.events.map((e) => (
        <Chip key={e.id} event={e} href={eventHref(e.id)} timezone={timezone} />
      ))}
      {cell.more > 0 && (
        <Link
          href={weekHref}
          className="px-1 text-xs text-muted-foreground hover:text-foreground"
        >
          +{cell.more} more
        </Link>
      )}
    </div>
  )
}

/** The month as a grid of days; each shows its first few meetings. */
export function MonthGrid({
  cells,
  timezone,
  eventHref,
}: {
  cells: MonthCell[][]
  timezone: string
  eventHref: (id: string) => string
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="grid min-w-[42rem] grid-cols-7 border-r border-b">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-l py-2 text-center text-sm text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.flat().map((cell) => (
          <Cell
            key={cell.day.date}
            cell={cell}
            timezone={timezone}
            eventHref={eventHref}
          />
        ))}
      </div>
    </div>
  )
}
