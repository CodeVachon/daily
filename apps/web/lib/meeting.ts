// What the calendar shows about one meeting (motte #72). Pure.
import { tz } from "@date-fns/tz"
import {
  RSVP_RESPONSES,
  type CalendarEvent,
  type EventAttendee,
  type Invitation,
  type ResponseStatus,
  type RsvpResponse,
  type RsvpScope,
} from "@workspace/db/core"
import { calendarDateIn } from "@workspace/db/time"
import { format } from "date-fns"

import { calendarHref } from "./calendar"

/** How a block looks: by my answer, or as a personal block. */
export type MeetingTone = "accepted" | "tentative" | "pending" | "block"

export function meetingTone(e: CalendarEvent): MeetingTone {
  if (e.eventType !== "default") return "block"
  if (e.myResponse === "tentative") return "tentative"
  if (e.myResponse === "needsAction") return "pending"
  return "accepted"
}

const RESPONSE_LABELS: Record<ResponseStatus, string> = {
  accepted: "Going",
  tentative: "Maybe",
  declined: "Not going",
  needsAction: "Not answered",
}

export const responseLabel = (r: ResponseStatus) => RESPONSE_LABELS[r]

const local = (at: Date, pattern: string, timezone: string) =>
  format(at, pattern, { in: tz(timezone) })

/** "10:00 – 10:15 AM", "11:30 AM – 12:30 PM", or "All day". */
export function timeRange(e: CalendarEvent, timezone: string): string {
  if (e.allDay) return "All day"
  const start = local(e.startAt, "h:mm a", timezone)
  const end = local(e.endAt, "h:mm a", timezone)
  const [startTime, startPeriod] = start.split(" ")
  return startPeriod === end.split(" ")[1]
    ? `${startTime} – ${end}`
    : `${start} – ${end}`
}

/** "10:00 AM" before a title in the month view; nothing for all-day. */
export const chipTime = (e: CalendarEvent, timezone: string): string =>
  e.allDay ? "" : local(e.startAt, "h:mm a", timezone)

/** "Thu, Nov 12 · 10:00 – 10:15 AM"; all-day ones by date (end exclusive). */
export function whenLabel(e: CalendarEvent, timezone: string): string {
  if (e.allDay) {
    const utc = tz("UTC")
    const first = format(e.startAt, "EEE, MMM d", { in: utc })
    const lastDay = new Date(e.endAt.getTime() - 86_400_000)
    const last = format(lastDay, "EEE, MMM d", { in: utc })
    return first === last ? `${first} · All day` : `${first} – ${last}`
  }
  return `${local(e.startAt, "EEE, MMM d", timezone)} · ${timeRange(e, timezone)}`
}

const ORDER: Record<ResponseStatus, number> = {
  accepted: 0,
  tentative: 1,
  needsAction: 2,
  declined: 3,
}

/** People first (organizer, then by answer, then name); rooms apart. */
export function attendeeGroups(e: CalendarEvent): {
  people: EventAttendee[]
  rooms: EventAttendee[]
} {
  const name = (a: EventAttendee) => (a.name ?? a.email ?? "").toLowerCase()
  const people = e.attendees
    .filter((a) => !a.resource)
    .sort(
      (a, b) =>
        Number(b.organizer) - Number(a.organizer) ||
        ORDER[a.response] - ORDER[b.response] ||
        name(a).localeCompare(name(b))
    )
  return { people, rooms: e.attendees.filter((a) => a.resource) }
}

/** "3 going, 1 maybe, 2 not answered" (people only). */
export function answerSummary(e: CalendarEvent): string {
  const { people } = attendeeGroups(e)
  const count = (r: ResponseStatus) =>
    people.filter((a) => a.response === r).length
  return (
    [
      [count("accepted"), "going"],
      [count("tentative"), "maybe"],
      [count("needsAction"), "not answered"],
      [count("declined"), "not going"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(", ")
}

export interface NextMeetingView {
  title: string
  /** "Now" while it's on, else its start ("2:30 PM", "Tomorrow 8:15 AM"). */
  when: string
  /** Its details on the calendar. */
  href: string
  meetUrl: string | null
}

function nextWhen(start: Date, now: Date, timezone: string): string {
  if (start <= now) return "Now"
  const time = local(start, "h:mm a", timezone)
  const sameDay =
    calendarDateIn(start, timezone) === calendarDateIn(now, timezone)
  return sameDay ? time : `Tomorrow ${time}`
}

/** The sidebar's "next meeting" line. */
export function nextMeetingView(
  e: CalendarEvent,
  now: Date,
  timezone: string
): NextMeetingView {
  return {
    title: e.title,
    when: nextWhen(e.startAt, now, timezone),
    href: calendarHref(calendarDateIn(e.startAt, timezone), { event: e.id }),
    meetUrl: e.meetUrl,
  }
}

export interface PersonView {
  key: string
  name: string
  response: ResponseStatus
  /** "Organizer", "You", "Optional". */
  tags: string[]
}

export interface MeetingDetailsView {
  join: { url: string; label: string } | null
  /** Dial-in numbers: "+1 555-0100 · PIN 123". */
  phones: { href: string; label: string }[]
  location: string | null
  /** "3 going, 1 maybe", or "Guests". */
  guestsTitle: string
  people: PersonView[]
  /** "Room 4, Room 5", or null. */
  rooms: string | null
  description: string | null
  attachments: { title: string; url: string }[]
  googleUrl: string | null
  /** Answer buttons: when I'm invited (not the organizer). */
  rsvp: RsvpView | null
}

export interface RsvpView {
  eventId: string
  current: ResponseStatus
  /** Offer "this event / all events" for recurring meetings. */
  recurring: boolean
}

/** Accept / Maybe / Decline, marking the current answer. */
export function rsvpChoices(current: ResponseStatus) {
  return RSVP_RESPONSES.map((response) => ({
    response,
    label: RSVP_LABELS[response],
    active: response === current,
  }))
}

const RSVP_LABELS: Record<RsvpResponse, string> = {
  accepted: "Accept",
  tentative: "Maybe",
  declined: "Decline",
}

/** The answer buttons, when there's something to answer. */
export function rsvpView(e: CalendarEvent): RsvpView | null {
  const me = e.attendees.find((a) => a.self)
  if (!me || me.organizer) return null
  return {
    eventId: e.id,
    current: me.response,
    recurring: Boolean(e.recurringEventId),
  }
}

const tagsOf = (a: EventAttendee) =>
  [
    a.organizer && "Organizer",
    a.self && "You",
    a.optional && "Optional",
  ].filter((t): t is string => Boolean(t))

/** Everything the meeting sheet shows, decided here so the view only renders. */
export function meetingDetailsView(
  e: CalendarEvent,
  description: string | null
): MeetingDetailsView {
  const { people, rooms } = attendeeGroups(e)
  return {
    join: e.meetUrl
      ? { url: e.meetUrl, label: `Join ${e.conferenceName ?? "meeting"}` }
      : null,
    phones: e.conference
      .filter((c) => c.type === "phone")
      .map((c) => ({
        href: c.uri,
        label: [c.label ?? c.uri, c.pin && `PIN ${c.pin}`]
          .filter(Boolean)
          .join(" · "),
      })),
    location: e.location,
    guestsTitle: answerSummary(e) || "Guests",
    people: people.map((a) => ({
      key: a.email ?? a.name ?? "",
      name: a.name ?? a.email ?? "Someone",
      response: a.response,
      tags: tagsOf(a),
    })),
    rooms: rooms.map((r) => r.name ?? r.email).join(", ") || null,
    description,
    attachments: e.attachments.map(({ title, url }) => ({ title, url })),
    googleUrl: e.htmlLink,
    rsvp: rsvpView(e),
  }
}

export interface InvitationView {
  key: string
  title: string
  /** "Thu, Nov 12 · 10:00 – 10:15 AM" (the next occurrence). */
  when: string
  /** "Recurring · 3 upcoming", or null for a one-off. */
  repeats: string | null
  href: string
  rsvp: RsvpView
  /** Recurring invitations are answered for the whole series by default. */
  scope: RsvpScope
}

/** The Invitations list on the Updates page. */
export function invitationViews(
  invitations: Invitation[],
  timezone: string
): InvitationView[] {
  return invitations.flatMap(({ event, occurrences }) => {
    const rsvp = rsvpView(event)
    if (!rsvp) return []
    const recurring = Boolean(event.recurringEventId)
    return [
      {
        key: event.id,
        title: event.title,
        when: whenLabel(event, timezone),
        repeats: recurring ? `Recurring · ${occurrences} upcoming` : null,
        href: calendarHref(calendarDateIn(event.startAt, timezone), {
          event: event.id,
        }),
        rsvp,
        scope: recurring ? "series" : "event",
      },
    ]
  })
}
