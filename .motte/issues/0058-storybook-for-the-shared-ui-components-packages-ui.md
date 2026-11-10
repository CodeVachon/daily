---
id: 58
title: Storybook for the shared UI components (packages/ui)
state: Done
assignee: Christopher Vachon
created: 2026-11-10T02:08:34Z
updated: 2026-11-10T02:12:51Z
---

## Notes

### 2026-11-10T02:12:51Z — Christopher Vachon (user)

Done: Storybook 10.6 (@storybook/react-vite) in packages/ui: .storybook/main.ts (Tailwind v4 via @tailwindcss/vite in viteFinal, addons docs/themes/a11y/mcp, telemetry off), preview.tsx (globals.css, withThemeByClassName light/dark, TooltipProvider + padded background decorator, autodocs, a11y test=error), preview-head.html (DM Sans/Merriweather/Geist Mono from Google Fonts setting the --font-* vars next/font provides in the app). 13 story files / 35 stories covering every shared component incl. overlays, menus, forms, data, feedback. stories.test.tsx renders every story via composeStories in happy-dom (47 tests) so broken stories fail the hook. Scripts: bun run storybook / storybook:build; storybook-static gitignored + eslint-ignored. Storybook MCP (@storybook/addon-mcp) verified at http://localhost:6006/mcp (docs-list, docs-show, stories-find-by-component, stories-preview...); documented rather than added to .mcp.json since it only exists while Storybook runs. Verified build + screenshots of stories in light/dark. AGENTS.md: shared components must ship a story.
