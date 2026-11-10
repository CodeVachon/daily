---
id: 59
title: "Board: horizontal scroll should be confined to the board, not the whole page"
state: Done
assignee: Christopher Vachon
created: 2026-11-10T02:19:58Z
updated: 2026-11-10T02:20:24Z
---

## Notes

### 2026-11-10T02:20:24Z — Christopher Vachon (user)

Cause: SidebarInset is a flex child with the default min-width:auto, so it grew to the board's full column width; the whole page scrolled sideways and the header (New task) and filter bar stretched past the window. Fix: className='min-w-0' on SidebarInset in app/(app)/layout.tsx, so the page fits the window and the board's own overflow-x-auto handles horizontal scroll; the filter bar now wraps. Verified with ui:shot at 1100px: page width 1356 -> 1100, New task visible.
