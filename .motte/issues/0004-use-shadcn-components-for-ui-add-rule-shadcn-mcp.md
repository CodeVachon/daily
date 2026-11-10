---
id: 4
title: Use shadcn components for UI; add rule + shadcn MCP
state: Done
assignee: Christopher Vachon
created: 2026-11-10T00:17:56Z
updated: 2026-11-10T00:19:36Z
---

## Notes

### 2026-11-10T00:19:36Z — Christopher Vachon (user)

Added shadcn card, alert, avatar, spinner via CLI (base-maia); restored lucide-react in ui (spinner) and web (alert icons). Rebuilt sign-in, consent and home pages from Card/Alert/Avatar/Spinner; initials() helper + tests. shadcn MCP server added to .mcp.json (packages/ui/node_modules/.bin/shadcn mcp --cwd apps/web), verified tools/list. AGENTS.md: 'UI: use shadcn components' rule. Fallow treats ui package exports as public API, so unused subcomponents (AlertAction, AvatarBadge...) are not flagged.
