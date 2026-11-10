---
id: 26
title: "App shell: navigation, layout and server actions with user actor"
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [12]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T01:42:56Z
---

## Description

Sidebar/top-nav shell (Board, List, Inbox, Projects, Settings) from shadcn (sidebar, breadcrumb). Server actions call services with `userActor(session)`.

## Plan

- shadcn sidebar, button, dropdown-menu for the user menu.
- `lib/actions/*` server actions: thin, validated, call services, revalidate.
- Home redirects to /board.

## Notes

### 2026-11-10T01:42:56Z — Christopher Vachon (user)

Done: (app) route group with requireSession layout, shadcn sidebar (collapsible icon, active nav via lib/nav.ts isActive), user menu (avatar, theme toggle, sign out) and PageHeader. '/' redirects to /board; /board is a read-only status-column view (DnD in #30) using lib/board.ts groupByStatus. Server-action pattern: lib/actions.ts runAsUser(mutation) -> {ok,data}|{ok:false,error} acting as userActor(session), expected errors become messages, bugs rethrow; mutations should call refresh() from next/cache (Next 16 docs). Added shadcn sidebar, dropdown-menu, badge (+tooltip/sheet/input/skeleton/separator); moved use-mobile into packages/ui/hooks and rewrote it with useSyncExternalStore (generated version tripped react-hooks lint). .fallowrc health.ignore packages/ui/src/components/** (vendored shadcn). New dev tool: bun run ui:shot <path> <out.png> [--dark] [--width=N] - throwaway seeded user + minted session + headless Chromium (cached Playwright shell) screenshot, then cleanup. Verified board light/dark via screenshots.
