---
id: 65
title: "Epic: Google Calendar meetings, RSVP, meeting tasks and a calendar view"
state: Todo
parent: 5
labels: [epic, integrations, calendar]
created: 2026-11-10T18:45:00Z
updated: 2026-11-10T18:45:00Z
---

## Description

Chris (2026-11-10): see Google Meet meetings from his Google Calendar (useAppello Workspace) in Daily, with all details; accept/decline from Daily; only accepted meetings appear in the todo list; a calendar in the app showing meetings and tasks with due dates.

Decisions (Chris, 2026-11-10):
- Auth: Google OAuth with an **Internal** OAuth app in the useAppello Workspace (no verification, refresh tokens don't expire weekly). Chris creates the Cloud project/client.
- Accepted meetings become **real tasks**, auto-created and kept in sync with the event (cancelled when declined/cancelled).
- RSVP from an **Invitations list** and from **meeting details** (Accept / Maybe / Decline, change later). Not via MCP: agents get read-only meeting tools.
- RSVPs notify the organizer like Google Calendar (sendUpdates=all).
- Calendar views: **Month + Week, drag a task to reschedule** (sets its due date/time). Meetings are moved in Google, not here.

API facts checked against Google's docs: RSVP = events.patch with only the self attendee's responseStatus (attendeesOmitted=true) and sendUpdates=all; incremental sync via nextSyncToken (can't be combined with timeMin/timeMax/orderBy; 410 Gone → wipe and full re-sync).
