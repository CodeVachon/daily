---
id: 67
title: "Calendar sync: cache every event with full details"
state: Done
parent: 65
assignee: claude-code
labels: [integrations, calendar, db, infra]
blockedBy: [66]
created: 2026-11-10T18:45:24Z
updated: 2026-11-11T20:47:43Z
---

## Description

Mirror the selected calendars' events into Daily, all details, kept fresh by the sync worker.

## Plan

- calendar_event (per user, calendar, event instance; singleEvents=true): title, description (HTML, rendered safely), location, start/end (timestamptz; all-day as date + zone), status (confirmed/tentative/cancelled), eventType (default/focusTime/outOfOffice/workingLocation), organizer, creator, attendees (email, name, response, optional, organizer, self, rooms), my responseStatus, Meet link (hangoutLink) and conferenceData entry points (video, phone + PIN), htmlLink, recurringEventId, attachments (Meet notes/recordings in Drive), visibility, updated.
- calendar_sync_state per calendar: nextSyncToken. First sync from 30 days ago; then incremental; 410 Gone → wipe that calendar and re-sync. Deleted/cancelled events removed.
- Worker job 'calendar-sync' next to link-sync (own advisory lock + heartbeat; every few minutes).
- Changes notify the live feed so open Calendar/Meetings pages refresh (extend the change feed beyond task_event, e.g. a calendar_changes channel).
- Tests: normalization fixtures (Meet, phone dial-in, all-day, recurring instance, declined, cancelled), sync-token and 410 paths.

## Notes

### 2026-11-11T20:47:42Z — claude-code (agent)

Built: calendar_event + calendar_sync_state (migration 0015), services.calendar (syncTargets, retainOnly, applySync with pg_notify('calendar_changes'), recordSyncError, syncStatus), services.calendarChanges feed; packages/integrations google-events.ts (normalizeEvent, fetchCalendarChanges: full from 30 days back, then syncToken; 410 → full), integrations.syncCalendars(); worker runs jobs [link-sync, calendar-sync] each with own lock + heartbeat; SSE sends `event: calendar` and LiveUpdates refreshes on it. Decision: Google expands recurring events decades ahead (7,563 rows / 11 MB for Chris's primary calendar, out to 2056), so only events up to 365 days ahead are kept and a full sync runs every 7 days (fullSyncedAt) to roll the window: now 1,100 rows / 1.8 MB; full sync 5.3s, incremental 0.2s. Verified live against Chris's calendar and with a real worker process (both heartbeats). Worker .env.schema now also picks TAILSCALE_URL + BETTER_AUTH_URL (googleConfig needs the redirect URL); a running `turbo dev` must be restarted to pick that up.
