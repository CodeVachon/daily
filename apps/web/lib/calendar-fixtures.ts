// Test-only: calendar events as the service returns them.
import type { CalendarEvent } from "@workspace/db/core"

let id = 0

export function calendarEvent(
  over: Partial<CalendarEvent> = {}
): CalendarEvent {
  id++
  return {
    id: `e${id}`,
    calendarId: "chris@example.com",
    externalId: `x${id}`,
    title: `Event ${id}`,
    description: null,
    location: null,
    startAt: new Date("2026-11-12T15:00:00Z"),
    endAt: new Date("2026-11-12T15:30:00Z"),
    allDay: false,
    timeZone: "America/Toronto",
    status: "confirmed",
    eventType: "default",
    organizer: null,
    creator: null,
    attendees: [],
    myResponse: "accepted",
    meetUrl: null,
    conferenceName: null,
    conference: [],
    htmlLink: null,
    recurringEventId: null,
    attachments: [],
    visibility: null,
    remoteUpdatedAt: null,
    ...over,
  }
}
