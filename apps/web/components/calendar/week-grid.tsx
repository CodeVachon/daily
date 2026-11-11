import type { CalendarEvent } from "@workspace/db/core"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import {
  blockPosition,
  hourLabels,
  type Block,
  type Week,
  type WeekLayout,
} from "@/lib/calendar"
import { meetingTone, timeRange } from "@/lib/meeting"

import { TONE } from "./tone"

/** Height of one hour in the grid. */
const HOUR_REM = 3

const COLUMNS = "grid grid-cols-[3.5rem_repeat(7,minmax(7rem,1fr))]"

function EventChip({ event, href }: { event: CalendarEvent; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "block truncate rounded-sm px-1.5 py-0.5 text-xs",
        TONE[meetingTone(event)]
      )}
    >
      {event.title}
    </Link>
  )
}

function EventBlock({
  block,
  hours,
  href,
  timezone,
}: {
  block: Block
  hours: WeekLayout["hours"]
  href: string
  timezone: string
}) {
  const { event } = block
  return (
    <Link
      href={href}
      scroll={false}
      style={blockPosition(block, hours)}
      className={cn(
        "absolute overflow-hidden rounded-sm px-1.5 py-0.5 text-xs leading-tight shadow-xs ring-1 ring-background hover:z-10 hover:shadow-md",
        TONE[meetingTone(event)]
      )}
    >
      <span className="block truncate font-medium">{event.title}</span>
      <span className="block truncate text-[0.7rem] opacity-80">
        {timeRange(event, timezone)}
      </span>
    </Link>
  )
}

/**
 * The week as a time grid: day headers, an all-day row, and timed meetings
 * placed by start and length (overlaps side by side). Each opens its details.
 */
export function WeekGrid({
  week,
  layout,
  now,
  timezone,
  eventHref,
}: {
  week: Week
  layout: WeekLayout
  now: { dayIndex: number; top: string } | null
  timezone: string
  eventHref: (id: string) => string
}) {
  const hours = hourLabels(layout.hours)
  const height = `${hours.length * HOUR_REM}rem`
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-max">
        <div
          className={cn(COLUMNS, "sticky top-0 z-20 border-b bg-background")}
        >
          <div />
          {week.days.map((day) => (
            <div
              key={day.date}
              className="flex items-baseline justify-center gap-1.5 border-l py-2 text-sm"
            >
              <span className="text-muted-foreground">{day.weekday}</span>
              <span
                className={cn(
                  "font-medium",
                  day.isToday &&
                    "rounded-full bg-primary px-1.5 text-primary-foreground"
                )}
              >
                {day.day}
              </span>
            </div>
          ))}
        </div>
        <div className={cn(COLUMNS, "border-b")}>
          <div className="py-1 pr-2 text-right text-[0.7rem] text-muted-foreground">
            All day
          </div>
          {layout.allDay.map((events, i) => (
            <div
              key={week.days[i]!.date}
              className="flex min-h-7 flex-col gap-0.5 border-l p-0.5"
            >
              {events.map((e) => (
                <EventChip key={e.id} event={e} href={eventHref(e.id)} />
              ))}
            </div>
          ))}
        </div>
        <div className={COLUMNS}>
          <div className="relative" style={{ height }}>
            {hours.map((label, i) => (
              <span
                key={label}
                className="absolute right-2 -translate-y-1/2 text-[0.7rem] text-muted-foreground"
                style={{ top: `${i * HOUR_REM}rem` }}
              >
                {i > 0 && label}
              </span>
            ))}
          </div>
          {layout.timed.map((blocks, i) => (
            <div
              key={week.days[i]!.date}
              className={cn(
                "relative border-l",
                week.days[i]!.isToday && "bg-primary/[0.03]"
              )}
              style={{
                height,
                backgroundImage:
                  "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                backgroundSize: `100% ${HOUR_REM}rem`,
              }}
            >
              {blocks.map((block) => (
                <EventBlock
                  key={block.event.id}
                  block={block}
                  hours={layout.hours}
                  href={eventHref(block.event.id)}
                  timezone={timezone}
                />
              ))}
              {now?.dayIndex === i && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-destructive"
                  style={{ top: now.top }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
