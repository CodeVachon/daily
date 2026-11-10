---
id: 29
title: Activity timeline component
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [14, 27]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T01:54:32Z
---

## Description

Readable history: 'Claude Code changed status Todo → In Progress, 5m ago', field diffs, comment events, link sync events, with distinct agent/user/system styling.

## Plan

Pure formatter (event → sentence) in lib with tests; component from shadcn avatar/badge/separator.

## Notes

### 2026-11-10T01:54:32Z — Christopher Vachon (user)

Done: ActivityTimeline on the task page (newest 50 events): actor avatar (initials for the user, bot icon for agents, sync icon for system), '<actor> <describeEvent text>' with status keys mapped to names, relative time with exact time (user's zone) in a tooltip. Pure formatting in lib/activity.ts (relativeTime via Intl.RelativeTimeFormat, toTimeline) with tests. ui:shot seed now includes a Claude Code edit on #3 so screenshots show agent attribution. Verified by screenshot.
