// Calendar events as Daily stores them (motte #67). Database-free: the sync
// in packages/integrations builds these from Google's events.

export type EventStatus = "confirmed" | "tentative"

/** Google's eventType; anything else is stored as "default". */
export const EVENT_TYPES = [
  "default",
  "focusTime",
  "outOfOffice",
  "workingLocation",
  "fromGmail",
  "birthday",
] as const
export type EventType = (typeof EVENT_TYPES)[number]

/** An attendee's answer to the invitation. */
export const RESPONSE_STATUSES = [
  "needsAction",
  "accepted",
  "tentative",
  "declined",
] as const
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number]

export interface EventPerson {
  email: string | null
  name: string | null
  /** This is the connected user. */
  self: boolean
}

export interface EventAttendee extends EventPerson {
  response: ResponseStatus
  optional: boolean
  organizer: boolean
  /** A room or other resource, not a person. */
  resource: boolean
}

/** One way to join: the Meet link, a phone number (with PIN), and so on. */
export interface ConferenceEntry {
  type: "video" | "phone" | "sip" | "more"
  uri: string
  label: string | null
  pin: string | null
}

/** A file on the event: Meet notes, a recording, an agenda in Drive. */
export interface EventAttachment {
  title: string
  url: string
  mimeType: string | null
}

/** Everything Daily keeps about one event instance. */
export interface CalendarEventInput {
  /** Google's id for this instance (recurring instances have their own). */
  externalId: string
  title: string
  /** HTML from Google; render it sanitized. */
  description: string | null
  location: string | null
  /** All-day events start and end at midnight UTC of their dates. */
  startAt: Date
  endAt: Date
  allDay: boolean
  /** The zone the event was scheduled in, when Google says. */
  timeZone: string | null
  status: EventStatus
  eventType: EventType
  organizer: EventPerson | null
  creator: EventPerson | null
  attendees: EventAttendee[]
  /** The connected user's own answer; null when they aren't invited. */
  myResponse: ResponseStatus | null
  /** The video link to join (Meet), if any. */
  meetUrl: string | null
  conferenceName: string | null
  conference: ConferenceEntry[]
  /** The event in Google Calendar. */
  htmlLink: string | null
  /** Set on instances of a recurring event: the series' id. */
  recurringEventId: string | null
  attachments: EventAttachment[]
  visibility: string | null
  remoteUpdatedAt: Date | null
}

/** One calendar's worth of changes from the provider. */
export interface CalendarSyncBatch {
  /** A full sync: everything not in `upserts` is gone. */
  full: boolean
  upserts: CalendarEventInput[]
  /** External ids of events that were deleted or cancelled. */
  deletes: string[]
  /** Where the next incremental sync starts. */
  nextSyncToken: string | null
}
