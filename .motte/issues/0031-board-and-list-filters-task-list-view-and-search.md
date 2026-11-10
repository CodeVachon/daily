---
id: 31
title: Board and list filters, task list view and search
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [30]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T02:00:50Z
---

## Description

Filter bar (project, label, priority, due window, text) shared by the board and a table list view; filters live in the URL.

## Plan

shadcn toggle-group, select, input, table; filter parsing/serialization in tested lib helpers.

## Notes

### 2026-11-10T02:00:50Z — Christopher Vachon (user)

Done: URL-backed filters (lib/filters.ts parse/serialize/toListInput/hasFilters, tested): q (text or #number), project, label, priority (multi), due window, show cancelled, sort. Shared FilterBar (debounced search, shadcn Select/ToggleGroup/Toggle, Clear) on the board and the new /tasks list page (shadcn Table: #, title, status, priority, due with overdue colour, project, labels, updated; sort board/updated/due; 200 cap with hint). Board hides cancelled unless 'Show cancelled'. Sidebar gains Tasks. Verified with screenshots + a one-off Playwright run (toggle -> ?priority=urgent 2 cards; search -> 1; Clear -> all 6).
