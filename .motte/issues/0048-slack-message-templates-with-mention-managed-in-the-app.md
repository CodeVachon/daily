---
id: 48
title: Slack message templates with @mention (managed in the app)
state: Done
parent: 11
assignee: claude-code
labels: [notifications, db, web, mcp]
blockedBy: [44]
created: 2026-11-10T00:44:37Z
updated: 2026-11-12T19:02:41Z
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

## Notes

### 2026-11-12T19:02:40Z — claude-code (agent)

Done.
- Engine: `packages/db/src/templates.ts` is a hand-rolled, logic-less Mustache subset (no dependency): `{{name}}`, `{{#list}}` (repeats), `{{#flag}}`/truthy text (shows once), `{{^name}}` (inverted), and standalone section lines are dropped.
- Validation: unknown variables, list variables used outside their list, unbalanced sections and other tag syntax are all errors.
- Escaping: values are Slack-escaped (&, <, >); `mention` and `links` are already-formatted mrkdwn and pass through raw.
- Standup template: `standup-template.ts` holds the schema, the default and the context. The has_* flags exist for section headings because Mustache can't test list length.
- Storage: a `message_template` row exists only once edited, otherwise the default applies. "Restore default" is an edit, and there's no delete (agents can edit but not delete).
- `user_settings.slack_member_id` is migration 0019. #45 should fill it from users.lookupByEmail when Slack connects.
- `standup.draft().slack` is now the user's template; the old Slack style in `formatStandup` was removed (Markdown only).
- MCP tools: `list_templates`, `get_template`, `preview_template`, `update_template`, `get_slack_member_id`, `set_slack_member_id`.
- Web: Settings > Templates has the member ID field, an Edit/Preview editor, Save / Restore default, and a variables sidebar.
- Live check: the running dev server kept serving the old @workspace/db module graph (services.templates undefined) even after touching files, so it needs a restart. Verified with a script against the dev DB instead: both the default and a custom template rendered with real tasks and links.
