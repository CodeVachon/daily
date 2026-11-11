---
id: 72
title: "Calendar week view: this week's meetings, meeting details, Next meeting line"
state: Done
parent: 70
assignee: claude-code
labels: [web, calendar]
created: 2026-11-11T21:23:24Z
updated: 2026-11-11T21:33:00Z
---

## Description

A Calendar page (sidebar) that opens on this week and shows the synced meetings in a time grid, with a details sheet (time, Join, dial-in, organizer, attendees and answers, description, attachments) and a 'Next: 14:30 Standup · Join' line in the sidebar. Read-only MCP meeting tools ship with it.

## Plan

- services.calendar.list(userId, {from,to}) (selected calendars, declined/cancelled excluded or flagged), get(userId, id), next(userId, now).
- /calendar?date=YYYY-MM-DD: week of that date in the browser zone (cookie/settings tz), prev/next/today; time grid built from shadcn primitives; all-day row; overlapping events side by side.
- Pure layout in lib/calendar.ts (week days across DST, minutes → position, overlap columns) with tests; components stay thin.
- Meeting sheet: Join (Meet), dial-in + PIN, organizer, attendees with answers, location, sanitized description, attachments, Open in Google Calendar; my response shown (RSVP buttons come in #68).
- Sidebar 'Next meeting' line (within 12 h) with Join.
- MCP: list_meetings (range), get_meeting, next_meeting (read-only).
- Live refresh already arrives via SSE `calendar` events.

## Notes

### 2026-11-11T21:32:59Z — claude-code (agent)

Built /calendar (week view, ?date= & ?event=), sidebar Calendar item, meeting sheet, Next meeting line, MCP list_meetings/get_meeting/next_meeting. Layout and view logic in apps/web/lib/calendar.ts + lib/meeting.ts (tested; components just render). Description HTML → safe Markdown moved to packages/integrations (descriptionMarkdown) for web + MCP. Gotcha: all-day events are stored at UTC midnight, so an instant-range query also returns the next day's all-day events for zones west of UTC; the grid and list_meetings compare all-day events by date. Next meeting window widened from 12h to 24h with a "Tomorrow 8:15 AM" label (at 4 PM there was nothing within 12h). Declined meetings hidden; needsAction dashed grey; tentative dashed; focus/OOO grey. Verified with Chris's real calendar (light, dark, 420px).
