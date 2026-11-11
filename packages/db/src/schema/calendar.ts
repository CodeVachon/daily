// A cache of the user's selected Google calendars (motte #67).
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import type {
  ConferenceEntry,
  EventAttachment,
  EventAttendee,
  EventPerson,
  EventStatus,
  EventType,
  ResponseStatus,
} from "../calendar-inputs"
import { user } from "./auth"

/** One event instance on one of the user's selected calendars. */
export const calendarEvent = pgTable(
  "calendar_event",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Google's calendar id (the primary calendar's is the email). */
    calendarId: text().notNull(),
    externalId: text().notNull(),
    title: text().notNull(),
    description: text(),
    location: text(),
    startAt: timestamp({ withTimezone: true }).notNull(),
    endAt: timestamp({ withTimezone: true }).notNull(),
    allDay: boolean().notNull().default(false),
    timeZone: text(),
    status: text().$type<EventStatus>().notNull(),
    eventType: text().$type<EventType>().notNull(),
    organizer: jsonb().$type<EventPerson | null>(),
    creator: jsonb().$type<EventPerson | null>(),
    attendees: jsonb().$type<EventAttendee[]>().notNull().default([]),
    myResponse: text().$type<ResponseStatus>(),
    meetUrl: text(),
    conferenceName: text(),
    conference: jsonb().$type<ConferenceEntry[]>().notNull().default([]),
    htmlLink: text(),
    recurringEventId: text(),
    attachments: jsonb().$type<EventAttachment[]>().notNull().default([]),
    visibility: text(),
    remoteUpdatedAt: timestamp({ withTimezone: true }),
    syncedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("calendar_event_ref_idx").on(
      t.userId,
      t.calendarId,
      t.externalId
    ),
    index("calendar_event_user_start_idx").on(t.userId, t.startAt),
  ]
)

/** Where each calendar's incremental sync resumes, and how it last went. */
export const calendarSyncState = pgTable(
  "calendar_sync_state",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    calendarId: text().notNull(),
    /** Google's nextSyncToken; null means a full sync is next. */
    syncToken: text(),
    lastSyncedAt: timestamp({ withTimezone: true }),
    /** The last full sync; a week on, the next one is full again. */
    fullSyncedAt: timestamp({ withTimezone: true }),
    /** Why the last sync failed; null once one succeeds. */
    lastError: text(),
  },
  (t) => [uniqueIndex("calendar_sync_state_ref_idx").on(t.userId, t.calendarId)]
)
