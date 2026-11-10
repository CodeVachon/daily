---
id: 48
title: Slack message templates with @mention (managed in the app)
state: Todo
parent: 11
labels: [notifications, db, web, mcp]
blockedBy: [44]
created: 2026-11-10T00:44:37Z
updated: 2026-11-10T00:44:37Z
---

## Description

Standup (and future) Slack posts are rendered from templates I can manage. Each message @mentions me, so other bots in the channel know it is about me (#5, answer 4).

## Plan

- `message_template` (id, user_id, key e.g. `standup`, name, body, updated + actor): Slack mrkdwn with variables, e.g. `{{mention}}`, `{{date}}`, `{{#done}}• {{title}} {{links}}{{/done}}`, `{{#in_progress}}`, `{{#up_next}}`, `{{#blocked}}`, `{{due_soon}}`. Logic-less (Mustache-style) so templates can't run code.
- Settings: my Slack user id (resolved from the Slack connection via users.identity / users.lookupByEmail, editable). `{{mention}}` renders `<@U…>`, a real Slack mention that other bots can parse.
- Seeded default standup template; validation on save (unknown variables are errors); live preview against today's data.
- Templates page from shadcn (textarea + preview tabs, variable reference sidebar).
- MCP: list_templates, get_template, update_template (an agent may edit templates, but not delete them; #5 answer 1).
- Tests for the renderer, the mention, escaping of task titles (Slack control characters &, <, >), and validation.
