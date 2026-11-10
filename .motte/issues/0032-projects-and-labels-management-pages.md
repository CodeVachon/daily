---
id: 32
title: Projects and labels management pages
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [19, 26]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T02:02:58Z
---

## Description

Create, rename, recolor and archive projects and labels.

## Plan

shadcn table, dialog, form; colour picker from a preset palette.

## Notes

### 2026-11-10T02:02:58Z — Christopher Vachon (user)

Done: /projects and /labels via one CatalogManager (create with name + palette colour, inline rename on blur/Enter, colour Select with dots, archive/unarchive for projects, delete with AlertDialog; user-only via services). Server actions in app/(app)/catalog-actions.ts. lib/colors.ts maps the COLORS palette to Tailwind dot classes (tested). Sidebar: Board, Tasks, Projects, Labels. Verified via a one-off Playwright run (create, rename, archive, delete persisted) + screenshot.
