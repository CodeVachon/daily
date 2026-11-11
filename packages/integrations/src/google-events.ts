// Google Calendar events → what Daily stores (motte #67): normalizing one
// event, and fetching a calendar's changes with sync tokens.
import {
  CALENDAR_SYNC_FUTURE_DAYS,
  CALENDAR_SYNC_PAST_DAYS,
  EVENT_TYPES,
  RESPONSE_STATUSES,
  type CalendarEventInput,
  type CalendarSyncBatch,
  type ConferenceEntry,
  type EventAttachment,
  type EventAttendee,
  type EventPerson,
  type EventType,
  type ResponseStatus,
} from "@workspace/db/core"

import { calendarGet } from "./google"
import { ProviderError } from "./http"
import type { Fetch } from "./types"

/** 2,500 per page (Google's maximum) × 40 pages is plenty for one calendar. */
const PAGE_SIZE = 2500
const MAX_PAGES = 40
const DAY_MS = 86_400_000

interface GooglePerson {
  email?: string
  displayName?: string
  self?: boolean
}

interface GoogleTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

/** The parts of a Google Calendar event Daily reads. */
export interface GoogleEvent {
  id: string
  status?: "confirmed" | "tentative" | "cancelled"
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  updated?: string
  start?: GoogleTime
  end?: GoogleTime
  eventType?: string
  visibility?: string
  recurringEventId?: string
  organizer?: GooglePerson
  creator?: GooglePerson
  attendees?: (GooglePerson & {
    responseStatus?: string
    optional?: boolean
    organizer?: boolean
    resource?: boolean
  })[]
  hangoutLink?: string
  conferenceData?: {
    conferenceSolution?: { name?: string }
    entryPoints?: {
      entryPointType?: string
      uri?: string
      label?: string
      pin?: string
      accessCode?: string
      passcode?: string
    }[]
  }
  attachments?: { fileUrl?: string; title?: string; mimeType?: string }[]
}

const person = (p: GooglePerson | undefined): EventPerson | null =>
  p
    ? {
        email: p.email ?? null,
        name: p.displayName ?? null,
        self: Boolean(p.self),
      }
    : null

const response = (value: string | undefined): ResponseStatus =>
  RESPONSE_STATUSES.find((r) => r === value) ?? "needsAction"

const eventType = (value: string | undefined): EventType =>
  EVENT_TYPES.find((t) => t === value) ?? "default"

/** All-day dates become midnight UTC; timed events keep their instant. */
function instant(time: GoogleTime | undefined): Date {
  if (time?.dateTime) return new Date(time.dateTime)
  return new Date(`${time?.date ?? "1970-01-01"}T00:00:00Z`)
}

const ENTRY_TYPES = ["video", "phone", "sip", "more"] as const

function conference(event: GoogleEvent): ConferenceEntry[] {
  return (event.conferenceData?.entryPoints ?? []).flatMap((e) => {
    const type = ENTRY_TYPES.find((t) => t === e.entryPointType)
    if (!type || !e.uri) return []
    return [
      {
        type,
        uri: e.uri,
        label: e.label ?? null,
        pin: e.pin ?? e.accessCode ?? e.passcode ?? null,
      },
    ]
  })
}

/**
 * The user's own answer: their attendee entry, or accepted when it's their
 * own event without invitations. Null when they're neither.
 */
function myResponse(event: GoogleEvent): ResponseStatus | null {
  const me = event.attendees?.find((a) => a.self)
  if (me) return response(me.responseStatus)
  return event.organizer?.self ? "accepted" : null
}

/** Google leaves fields out; Daily stores null. */
const orNull = <T>(value: T | undefined): T | null => value ?? null

function times(event: GoogleEvent) {
  return {
    startAt: instant(event.start),
    endAt: instant(event.end ?? event.start),
    allDay: Boolean(event.start?.date && !event.start.dateTime),
    timeZone: orNull(event.start?.timeZone),
  }
}

function attendees(event: GoogleEvent): EventAttendee[] {
  return (event.attendees ?? []).map((a) => ({
    ...person(a)!,
    response: response(a.responseStatus),
    optional: Boolean(a.optional),
    organizer: Boolean(a.organizer),
    resource: Boolean(a.resource),
  }))
}

function attachments(event: GoogleEvent): EventAttachment[] {
  return (event.attachments ?? []).flatMap((a) =>
    a.fileUrl
      ? [
          {
            title: a.title ?? a.fileUrl,
            url: a.fileUrl,
            mimeType: orNull(a.mimeType),
          },
        ]
      : []
  )
}

/** The Meet link, else any video entry point (Zoom and the like). */
function meetUrl(event: GoogleEvent, entries: ConferenceEntry[]) {
  return (
    event.hangoutLink ?? entries.find((e) => e.type === "video")?.uri ?? null
  )
}

/** One event as Daily stores it. Cancelled ones aren't stored at all. */
export function normalizeEvent(event: GoogleEvent): CalendarEventInput {
  const entries = conference(event)
  return {
    externalId: event.id,
    title: event.summary?.trim() || "(No title)",
    description: orNull(event.description),
    location: orNull(event.location),
    ...times(event),
    status: event.status === "tentative" ? "tentative" : "confirmed",
    eventType: eventType(event.eventType),
    organizer: person(event.organizer),
    creator: person(event.creator),
    attendees: attendees(event),
    myResponse: myResponse(event),
    meetUrl: meetUrl(event, entries),
    conferenceName: orNull(event.conferenceData?.conferenceSolution?.name),
    conference: entries,
    htmlLink: orNull(event.htmlLink),
    recurringEventId: orNull(event.recurringEventId),
    attachments: attachments(event),
    visibility: orNull(event.visibility),
    remoteUpdatedAt: event.updated ? new Date(event.updated) : null,
  }
}

interface EventsPage {
  items?: GoogleEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

async function listEvents(
  fetch: Fetch,
  accessToken: string,
  calendarId: string,
  start: { syncToken: string } | { timeMin: string }
): Promise<{ items: GoogleEvent[]; nextSyncToken: string | null }> {
  const items: GoogleEvent[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    // The same parameters every time, as Google's sync tokens require.
    const params = new URLSearchParams({
      singleEvents: "true",
      maxResults: String(PAGE_SIZE),
      ...start,
    })
    if (pageToken) params.set("pageToken", pageToken)
    const result = await calendarGet<EventsPage>(
      fetch,
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    )
    items.push(...(result.items ?? []))
    pageToken = result.nextPageToken
    if (!pageToken)
      return { items, nextSyncToken: result.nextSyncToken ?? null }
  }
  // Too many to finish: keep what we have; the next pass starts over.
  return { items, nextSyncToken: null }
}

/**
 * Kept: live events up to a month ahead. Cancelled ones, and ones now beyond
 * the horizon (moved, or far instances of a series), are removed.
 */
function toBatch(
  full: boolean,
  { items, nextSyncToken }: Awaited<ReturnType<typeof listEvents>>,
  now: Date
): CalendarSyncBatch {
  const horizon = now.getTime() + CALENDAR_SYNC_FUTURE_DAYS * DAY_MS
  const live = items.filter((e) => e.status !== "cancelled").map(normalizeEvent)
  const kept = live.filter((e) => e.startAt.getTime() <= horizon)
  const keptIds = new Set(kept.map((e) => e.externalId))
  return {
    full,
    upserts: kept,
    deletes: items.map((e) => e.id).filter((id) => !keptIds.has(id)),
    nextSyncToken,
  }
}

/**
 * A calendar's changes since `syncToken`, or everything from 30 days ago
 * (to a month ahead) when there's no token or Google says it expired (410).
 */
export async function fetchCalendarChanges(
  fetch: Fetch,
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
  now = new Date()
): Promise<CalendarSyncBatch> {
  if (syncToken)
    try {
      return toBatch(
        false,
        await listEvents(fetch, accessToken, calendarId, { syncToken }),
        now
      )
    } catch (error) {
      if (!(error instanceof ProviderError && error.status === 410)) throw error
    }
  const timeMin = new Date(
    now.getTime() - CALENDAR_SYNC_PAST_DAYS * DAY_MS
  ).toISOString()
  return toBatch(
    true,
    await listEvents(fetch, accessToken, calendarId, { timeMin }),
    now
  )
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
}

/**
 * Google's HTML description as Markdown text: links kept (http/https only),
 * line breaks kept, every other tag dropped. Rendered by the Markdown
 * component, which never renders raw HTML.
 */
export function descriptionMarkdown(html: string | null): string | null {
  if (!html?.trim()) return null
  const text = html
    .replace(/<(script|style)[^>]*>.*?<\/\1>/gis, "")
    .replace(
      /<a\s[^>]*href="(https?:[^"]+)"[^>]*>(.*?)<\/a>/gis,
      (_, href: string, label: string) => {
        const inner = label.replace(/<[^>]+>/g, "").trim()
        return inner && inner !== href ? `[${inner}](${href})` : href
      }
    )
    .replace(/<br\s*\/?>/gi, "  \n")
    .replace(/<\/?(p|div|h[1-6])(\s[^>]*)?>|<\/li>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(
      /&(amp|lt|gt|quot|#39|nbsp);/g,
      (_, name: string) => ENTITIES[name]!
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}
