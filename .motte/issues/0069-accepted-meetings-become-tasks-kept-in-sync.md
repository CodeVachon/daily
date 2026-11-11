---
id: 69
title: Accepted meetings become tasks, kept in sync
state: Todo
parent: 65
labels: [calendar, db, integrations]
blockedBy: [67]
created: 2026-11-10T18:45:24Z
updated: 2026-11-10T18:45:24Z
---

## Description

Every meeting you've accepted (or organize) shows in your todo list as a real task; declining or cancellation cancels it.

## Plan

- task.calendarEventId (or a link row of provider google_calendar) ties a task to an event instance.
- Rule (pure, tested): a meeting (has other attendees or a Meet link; not focusTime/outOfOffice/workingLocation) where my response is accepted, or I'm the organizer, starting within the next 14 days → ensure a task: title = meeting title, due = start (instant, event zone), description with Meet link, label 'meeting'. Created by the 'sync' system actor so it shows in history and Updates.
- Changes: new time/title → update the task (sync actor); declined/cancelled/deleted → status cancelled; re-accepted → back to Todo. Never overwrite a task the user moved to Done.
- Open question for Chris when we get here: after the meeting ends, leave it in Todo for you to tick off, or move it to Done automatically?
- Tests: rule table, create/update/cancel/reopen paths, idempotency.
