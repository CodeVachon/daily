---
id: 67
title: "Calendar sync: cache every event with full details"
state: Todo
parent: 65
labels: [integrations, calendar, db, infra]
blockedBy: [66]
created: 2026-11-10T18:45:24Z
updated: 2026-11-10T18:45:24Z
---

## Description

Mirror the selected calendars' events into Daily, all details, kept fresh by the sync worker.

## Plan

- calendar_event (per user, calendar, event instance; singleEvents=true): title, description (HTML, rendered safely), location, start/end (timestamptz; all-day as date + zone), status (confirmed/tentative/cancelled), eventType (default/focusTime/outOfOffice/workingLocation), organizer, creator, attendees (email, name, response, optional, organizer, self, rooms), my responseStatus, Meet link (hangoutLink) and conferenceData entry points (video, phone + PIN), htmlLink, recurringEventId, attachments (Meet notes/recordings in Drive), visibility, updated.
- calendar_sync_state per calendar: nextSyncToken. First sync from 30 days ago; then incremental; 410 Gone → wipe that calendar and re-sync. Deleted/cancelled events removed.
- Worker job 'calendar-sync' next to link-sync (own advisory lock + heartbeat; every few minutes).
- Changes notify the live feed so open Calendar/Meetings pages refresh (extend the change feed beyond task_event, e.g. a calendar_changes channel).
- Tests: normalization fixtures (Meet, phone dial-in, all-day, recurring instance, declined, cancelled), sync-token and 410 paths.
