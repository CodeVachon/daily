---
id: 46
title: "Timezone correctness: timestamptz everywhere, browser timezone for display and dates"
state: Todo
parent: 6
labels: [db, web]
created: 2026-11-10T00:44:18Z
updated: 2026-11-10T00:52:03Z
---

## Description

Use the browser's timezone; Postgres must handle timezones correctly (#5, answer 2). **Chris travels coast to coast**, so the current timezone changes. The app must make times unambiguous and keep "today", overdue and standup windows correct wherever he is.

## Plan

Storage
- Every timestamp column is `timestamptz` (UTC). Migrate the generated OAuth/JWKS tables (`mcp-oauth.ts` uses plain `timestamp`) to `withTimezone: true`. Pin the session `timezone=UTC` in postgres-js and PGlite.
- A test that inspects information_schema and fails on any `timestamp without time zone` column.

Due dates (two kinds)
- **Date-only** ("due Friday"): a `date` column; it is "floating": Friday wherever I am. Overdue = after the end of that date in my *current* timezone.
- **Date + time** ("due 5pm"): a `timestamptz` instant plus `due_tz` (the IANA zone it was set in). It is a fixed moment: 5:00 PM ET shows as 2:00 PM PT when I'm in Vancouver, with the original shown, e.g. "2:00 PM PT (5:00 PM ET)".
- Agents creating tasks via MCP send ISO 8601 with an offset or a date-only value; `due_tz` defaults to my current zone.

Current timezone
- The browser reports `Intl.DateTimeFormat().resolvedOptions().timeZone` on load and on focus; the server stores it in `user_settings.timezone` plus a `timezone_changed_at`. When it changes, show a small non-blocking notice ("Times now shown in Pacific Time").
- Everything server-rendered (board, inbox, standup, push text) formats with the current stored zone; client components use the live browser zone.
- MCP tools use the stored current zone for "today"/"this week", and return ISO with offset plus the zone name, so agents see unambiguous times.
- The standup window ("since last standup") is instant-based, so travel doesn't skip or duplicate items; the header date is in my current zone.

Tests
- Date-window helpers across DST transitions and zone changes (ET ↔ PT), floating vs fixed due dates, and overdue computation at day boundaries.
