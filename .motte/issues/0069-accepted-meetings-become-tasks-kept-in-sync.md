---
id: 69
title: Accepted meetings become tasks, kept in sync
state: Done
parent: 65
assignee: claude-code
labels: [calendar, db, integrations]
blockedBy: [67]
created: 2026-11-10T18:45:24Z
updated: 2026-11-11T21:52:13Z
---

## Description

Every meeting you've accepted (or organize) shows in your todo list as a real task; declining or cancellation cancels it.

## Plan

- task.calendarEventId (or a link row of provider google_calendar) ties a task to an event instance.
- Rule (pure, tested): a meeting (has other attendees or a Meet link; not focusTime/outOfOffice/workingLocation) where my response is accepted, or I'm the organizer, starting within the next 14 days → ensure a task: title = meeting title, due = start (instant, event zone), description with Meet link, label 'meeting'. Created by the 'sync' system actor so it shows in history and Updates.
- Changes: new time/title → update the task (sync actor); declined/cancelled/deleted → status cancelled; re-accepted → back to Todo. Never overwrite a task the user moved to Done.
- After the meeting ends (end time passed, still accepted, task still open): move it to Done automatically, by the sync actor (decided by Chris 2026-11-11). If the user reopens it afterwards, leave it open (don't re-close the same event instance).
- Tests: rule table, create/update/cancel/reopen paths, auto-done after end, user-reopened stays open, idempotency.

## Notes

### 2026-11-11T20:38:05Z — claude-code (agent)

Decision (Chris, 2026-11-11): a meeting whose end time has passed moves its task to Done automatically. Open question resolved; plan updated.

### 2026-11-11T21:52:09Z — claude-code (agent)

Built: pure rules in packages/db/src/meeting-tasks.ts (isGoing: default type, not all-day, other people or a Meet link, accepted or organizer; meetingTaskAction: create within 14 days / cancel when declined or gone / reopen to Todo when accepted again / Done once after it ends / follow title+time; never touch done or deleted tasks). meeting_task table (migration 0016) links (calendar, event id) → task and survives full re-syncs (calendar_event rows are replaced). services.meetingTasks.reconcile runs in the worker's calendar-sync pass (holds the job's advisory lock, so no duplicate tasks); not on RSVP, so an accepted invitation becomes a task within a minute. Gone meetings only count as gone while the calendar is still synced and within the synced past window (25 days), so deselecting a calendar or old meetings never cancel tasks. get_meeting returns task_number; the meeting sheet links "Task #n". Live: dev worker created tasks #2 and #3 for Chris's accepted Executive L10 meetings.
