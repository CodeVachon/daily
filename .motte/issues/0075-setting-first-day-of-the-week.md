---
id: 75
title: "Setting: first day of the week"
state: Done
assignee: claude-code
labels: [calendar]
created: 2026-11-12T13:26:24Z
updated: 2026-11-12T13:29:21Z
---

## Description

Chris wants weeks to start on Sunday, not Monday, on the Calendar week view. Add a per-user "Week starts on" setting (Sunday, Monday or Saturday; Sunday by default) and use it everywhere a week is computed.

## Plan

- user_settings.week_starts_on (int 0/1/6, default 0) + migration
- services.settings.getWeekStart / updateWeekStart
- time.weekInterval takes weekStartsOn; calendar weekOf/monthOf take it; tasks "due this week" uses it
- Settings → Calendar page with a select; server action
- MCP get_week_start / set_week_start
- Tests for each
