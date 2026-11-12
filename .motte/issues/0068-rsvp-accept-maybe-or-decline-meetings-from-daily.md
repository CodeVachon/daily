---
id: 68
title: "RSVP: accept, maybe or decline meetings from Daily"
state: Done
parent: 65
assignee: claude-code
labels: [integrations, calendar, web]
blockedBy: [67]
created: 2026-11-10T18:45:24Z
updated: 2026-11-11T21:44:47Z
---

## Description

Answer invitations from Daily; Google notifies the organizer as usual.

## Plan

- integrations.rsvp(userId, eventId, accepted|tentative|declined): events.patch with attendees=[self with responseStatus], attendeesOmitted=true, sendUpdates=all; recurring: this event or the whole series (recurringEventId). Update the cache straight away; sync confirms.
- User only (server action); no MCP write tool (Chris, 2026-11-10).
- Invitations list: events where my response is needsAction, with Accept / Maybe / Decline; also counted on the Updates page.
- Meeting detail sheet: all details, Join (Meet), dial-in, attendees with responses, attachments, Open in Google Calendar, RSVP buttons (change an earlier answer).
- Tests: request shape per choice, series vs instance, error mapping.

## Notes

### 2026-11-11T21:44:42Z — claude-code (agent)

Built: answerInvitation (events.patch, attendeesOmitted + only my attendee entry, sendUpdates=all; series via recurringEventId), integrations.rsvp (refuses when not invited or I'm the organizer; Google first, then services.calendar.setMyResponse updates the cache + notifies), user-only rsvpAction (no agent write tool). UI: Accept/Maybe/Decline in the meeting sheet with a "this event / all events" switch for recurring meetings; Invitations section at the top of Updates (one row per series, recurring default to all events) counted in the Updates badge. list_invitations MCP tool (read-only) ships here, covering #71. Not clicked live: an RSVP emails a real organizer; Chris to try one. Gotcha: tests that mix real-now fixtures with fixed 2026-11-12 dates collided on Nov 11; fixed dates moved to 2025.
