import { services } from "@workspace/db"
import { NotFoundError } from "@workspace/db/core"
import { calendarDateIn } from "@workspace/db/time"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { MeetingDetails } from "@/components/calendar/meeting-details"
import { MeetingSheet } from "@/components/calendar/meeting-sheet"
import { WeekGrid } from "@/components/calendar/week-grid"
import { PageHeader } from "@/components/page-header"
import {
  calendarHref,
  layoutWeek,
  nowPosition,
  openEventId,
  parseCalendarDate,
  weekOf,
} from "@/lib/calendar"
import { whenLabel } from "@/lib/meeting"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Calendar · Daily" }

/** The open meeting, if `?event=` names one of the user's. */
async function MeetingSlot({
  userId,
  eventId,
  timezone,
  closeHref,
}: {
  userId: string
  eventId: string | null
  timezone: string
  closeHref: string
}) {
  if (!eventId) return null
  const event = await services.calendar.get(userId, eventId).catch((error) => {
    if (error instanceof NotFoundError) return null
    throw error
  })
  if (!event) return null
  return (
    <MeetingSheet
      title={event.title}
      when={whenLabel(event, timezone)}
      closeHref={closeHref}
    >
      <MeetingDetails event={event} />
    </MeetingSheet>
  )
}

function NotConnected() {
  return (
    <Alert className="m-4 w-auto">
      <CalendarIcon />
      <AlertTitle>Google Calendar isn’t connected</AlertTitle>
      <AlertDescription>
        <span>
          Connect it in{" "}
          <Link href="/settings/integrations" className="underline">
            Settings › Integrations
          </Link>{" "}
          to see your meetings here.
        </span>
      </AlertDescription>
    </Alert>
  )
}

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const { user } = await requireSession()
  const params = await searchParams
  const timezone = await services.settings.getTimezone(user.id)
  const now = new Date()
  const anchor =
    parseCalendarDate(params.date, timezone) ?? calendarDateIn(now, timezone)
  const week = weekOf(anchor, now, timezone)
  const [events, google] = await Promise.all([
    services.calendar.list(user.id, week.interval),
    services.integrations.get(user.id, "google"),
  ])
  const layout = layoutWeek(events, week)
  const nav = (date: string) => (
    <Link href={calendarHref(date)} scroll={false} />
  )
  return (
    <div className="flex h-svh flex-col">
      <PageHeader title="Calendar">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {week.title}
        </span>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={nav(week.today)}
          disabled={week.isCurrent}
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous week"
          nativeButton={false}
          render={nav(week.prev)}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next week"
          nativeButton={false}
          render={nav(week.next)}
        >
          <ChevronRightIcon />
        </Button>
      </PageHeader>
      {!google && <NotConnected />}
      <WeekGrid
        week={week}
        layout={layout}
        now={nowPosition(week, layout.hours, now)}
        timezone={timezone}
        eventHref={(id) => calendarHref(anchor, id)}
      />
      <MeetingSlot
        userId={user.id}
        eventId={openEventId(params.event)}
        timezone={timezone}
        closeHref={calendarHref(anchor)}
      />
    </div>
  )
}
