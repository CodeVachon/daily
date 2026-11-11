import { services } from "@workspace/db"
import { calendarDateIn, type CalendarDate } from "@workspace/db/time"
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
import { MonthGrid } from "@/components/calendar/month-grid"
import { WeekGrid } from "@/components/calendar/week-grid"
import { PageHeader } from "@/components/page-header"
import {
  calendarHref,
  layoutMonth,
  layoutWeek,
  monthOf,
  nowPosition,
  openEventId,
  parseCalendarDate,
  parseView,
  stepLabels,
  viewLinks,
  weekOf,
  type CalendarView,
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
  const event = await services.calendar.find(userId, eventId)
  if (!event) return null
  return (
    <MeetingSheet
      title={event.title}
      when={whenLabel(event, timezone)}
      closeHref={closeHref}
    >
      <MeetingDetails
        event={event}
        taskNumber={await services.meetingTasks.taskFor(userId, event)}
      />
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

interface Period {
  title: string
  today: CalendarDate
  prev: CalendarDate
  next: CalendarDate
  isCurrent: boolean
}

function Toolbar({
  view,
  anchor,
  period,
}: {
  view: CalendarView
  anchor: CalendarDate
  period: Period
}) {
  const go = (date: string) => (
    <Link href={calendarHref(date, { view })} scroll={false} />
  )
  const labels = stepLabels(view)
  return (
    <>
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {period.title}
      </span>
      <div className="flex rounded-full border p-0.5">
        {viewLinks(view, anchor).map((v) => (
          <Button
            key={v.view}
            size="xs"
            variant={v.variant}
            nativeButton={false}
            render={<Link href={v.href} scroll={false} />}
          >
            {v.label}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={go(period.today)}
        disabled={period.isCurrent}
      >
        Today
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={labels.prev}
        nativeButton={false}
        render={go(period.prev)}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={labels.next}
        nativeButton={false}
        render={go(period.next)}
      >
        <ChevronRightIcon />
      </Button>
    </>
  )
}

interface ViewProps {
  userId: string
  anchor: CalendarDate
  now: Date
  timezone: string
  /** Shown under the header (e.g. "not connected"). */
  banner: React.ReactNode
}

const eventHrefFor =
  (anchor: CalendarDate, view: CalendarView) => (id: string) =>
    calendarHref(anchor, { view, event: id })

async function WeekView({ userId, anchor, now, timezone, banner }: ViewProps) {
  const week = weekOf(anchor, now, timezone)
  const layout = layoutWeek(
    await services.calendar.list(userId, week.interval),
    week
  )
  return (
    <>
      <PageHeader title="Calendar">
        <Toolbar view="week" anchor={anchor} period={week} />
      </PageHeader>
      {banner}
      <WeekGrid
        week={week}
        layout={layout}
        now={nowPosition(week, layout.hours, now)}
        timezone={timezone}
        eventHref={eventHrefFor(anchor, "week")}
      />
    </>
  )
}

async function MonthView({ userId, anchor, now, timezone, banner }: ViewProps) {
  const month = monthOf(anchor, now, timezone)
  const cells = layoutMonth(
    await services.calendar.list(userId, month.interval),
    month
  )
  return (
    <>
      <PageHeader title="Calendar">
        <Toolbar view="month" anchor={anchor} period={month} />
      </PageHeader>
      {banner}
      <MonthGrid
        cells={cells}
        timezone={timezone}
        eventHref={eventHrefFor(anchor, "month")}
      />
    </>
  )
}

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const { user } = await requireSession()
  const params = await searchParams
  const [timezone, google] = await Promise.all([
    services.settings.getTimezone(user.id),
    services.integrations.get(user.id, "google"),
  ])
  const now = new Date()
  const anchor =
    parseCalendarDate(params.date, timezone) ?? calendarDateIn(now, timezone)
  const view = parseView(params.view)
  const View = view === "month" ? MonthView : WeekView
  return (
    <div className="flex h-svh flex-col">
      <View
        userId={user.id}
        anchor={anchor}
        now={now}
        timezone={timezone}
        banner={google ? null : <NotConnected />}
      />
      <MeetingSlot
        userId={user.id}
        eventId={openEventId(params.event)}
        timezone={timezone}
        closeHref={calendarHref(anchor, { view })}
      />
    </div>
  )
}
