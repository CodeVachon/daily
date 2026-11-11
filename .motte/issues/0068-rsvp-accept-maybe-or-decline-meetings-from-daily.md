---
id: 68
title: "RSVP: accept, maybe or decline meetings from Daily"
state: Todo
parent: 65
labels: [integrations, calendar, web]
blockedBy: [67]
created: 2026-11-10T18:45:24Z
updated: 2026-11-10T18:45:24Z
---

## Description

Answer invitations from Daily; Google notifies the organizer as usual.

## Plan

- integrations.rsvp(userId, eventId, accepted|tentative|declined): events.patch with attendees=[self with responseStatus], attendeesOmitted=true, sendUpdates=all; recurring: this event or the whole series (recurringEventId). Update the cache straight away; sync confirms.
- User only (server action); no MCP write tool (Chris, 2026-11-10).
- Invitations list: events where my response is needsAction, with Accept / Maybe / Decline; also counted on the Updates page.
- Meeting detail sheet: all details, Join (Meet), dial-in, attendees with responses, attachments, Open in Google Calendar, RSVP buttons (change an earlier answer).
- Tests: request shape per choice, series vs instance, error mapping.
