---
id: 62
title: "Settings page: appearance (base colour, theme, chart colours) and labels moved there"
state: Done
assignee: Christopher Vachon
created: 2026-11-10T02:40:49Z
updated: 2026-11-10T02:49:39Z
---

## Notes

### 2026-11-10T02:49:39Z — claude-code (agent)

Shipped. Palettes are snapshotted from shadcn's own theme builder (https://ui.shadcn.com/init, base-maia) by `bun run --cwd packages/ui themes:generate` into packages/ui/src/lib/theme-presets.json: 7 base colours (shadcn lists "gray", but the builder rejects it for this style, so it is skipped), 17 themes and 17 chart palettes. Theme overrides are diffed against two bases (neutral and mist): with only one, a dark secondary-foreground that happened to equal neutral's own value was dropped. The composed vars matched the builder exactly on 28 random combinations. Rule (shadcn's): grey-family theme/chart values are only valid as the current base (= no accent), so applyAppearance (db core, shared by the service and the client's optimistic state) makes a base-valued theme or chart follow a base change and rejects other base names. The user's CSS is injected as a <style> in the (app) layout, after globals.css. Dead end: when the base changed, the Theme Select (Base UI) fired onValueChange with its stale initial value ("sky") once its options changed. The fix is to remount the theme and chart selects keyed by base colour (opening the popup below the trigger did not help). Verified in Playwright: violet, stone, follow-base to zinc, emerald charts, persisted across a reload, dark mode. /labels permanently redirects to /settings/labels; the sidebar has Settings in place of Labels. MCP: get_appearance and update_appearance.
