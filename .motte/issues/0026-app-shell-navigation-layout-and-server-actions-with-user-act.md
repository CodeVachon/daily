---
id: 26
title: "App shell: navigation, layout and server actions with user actor"
state: Todo
parent: 8
labels: [web]
blockedBy: [12]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T00:35:25Z
---

## Description

Sidebar/top-nav shell (Board, List, Inbox, Projects, Settings) from shadcn (sidebar, breadcrumb). Server actions call services with `userActor(session)`.

## Plan

- shadcn sidebar, button, dropdown-menu for the user menu.
- `lib/actions/*` server actions: thin, validated, call services, revalidate.
- Home redirects to /board.
