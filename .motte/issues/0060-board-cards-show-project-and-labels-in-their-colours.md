---
id: 60
title: "Board cards: show project and labels in their colours"
state: Done
assignee: Christopher Vachon
created: 2026-11-10T02:22:30Z
updated: 2026-11-10T02:25:35Z
---

## Notes

### 2026-11-10T02:24:15Z — Christopher Vachon (user)

Done: projects and labels on board cards (and the Tasks list) show their colour - ColorBadge = outline badge tinted with the palette colour (lib/colors chipClass: border-*/30 bg-*/10 text-*-700, dark:text-*-300) plus a colour dot; uncoloured ones keep the plain badge (secondary for projects, outline for labels). BoardCard.project/labels now carry {name, color}. ui:shot seeds coloured labels. Verified light/dark screenshots + computed styles (the faint fringe in downscaled PNGs is antialiasing).

### 2026-11-10T02:25:35Z — Christopher Vachon (user)

Hook caught TaskRow over fallow's CRAP threshold (untested .tsx with optional chains/conditionals). Moved the row's display logic into lib/task-list.ts toTaskRow (tested); TaskRow is now plain markup with a ChipsCell helper.
