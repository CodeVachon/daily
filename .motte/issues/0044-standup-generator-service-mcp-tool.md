---
id: 44
title: Standup generator (service + MCP tool)
state: Done
parent: 11
assignee: claude-code
labels: [db, mcp, notifications]
blockedBy: [14, 15]
created: 2026-11-10T00:35:16Z
updated: 2026-11-12T14:53:01Z
---

## Description

Build a standup draft from tasks and activity: done since the last standup, in progress, up next / due soon, blocked (with linked PRs/tickets).

## Plan

- Pure rules in `packages/db/src/standup.ts` (no DB): sectioning (done / in progress / up next / blocked), default "since", Markdown + Slack mrkdwn formatters (Slack escapes &, <, >). #48 replaces the Slack formatter with managed templates.
- `standup_post` table (id, user_id, posted_at, channel null, body, actor columns) — migration 0018.
- `services.standup`: `draft(userId, { since?, now? })` → { since, until, sections, markdown, slack }; `record(actor, { body, channel? })` ("I posted it"); `history(userId, limit)`.
  - since = explicit, else the last post, else the start of the previous working day (Mon → Fri) in the user's zone.
  - Done: completed in [since, now). In progress: active, not blocked. Blocked: status Blocked, or open blockers (listed). Up next: not started, due by the end of the next working day (overdue flagged). Each item carries its links (key, state, url).
  - Meeting tasks (label "meeting") are left out: they're calendar, not work.
- `LinkChip` gains `url`.
- MCP: `draft_standup` (since?, format), `record_standup` (body, channel?), `list_standups`. Posting to Slack is #45.
- Web: /standup page — the draft as Markdown, Copy, and "Mark as posted" (records it so the next draft starts from now).
- Tests: pure rules, service on PGlite, MCP tools.

## Notes

### 2026-11-12T14:53:00Z — claude-code (agent)

Done.
- Pure rules are in `packages/db/src/standup.ts`. Up next covers open tasks due by the end of the next working day, plus overdue ones. Date-only tasks due today read "due today".
- Meeting tasks (label "meeting") are left out of every section. The sync auto-completes them, so including them would flood Done.
- Service: `services.standup.draft`/`record`/`history`; `standup_post` is migration 0018.
- `LinkChip` gained `url`.
- MCP tools: `draft_standup`, `record_standup`, `list_standups`. Posting is #45, and templates are #48: the Slack formatter here is the plain fallback that #48's templates replace.
- Web: /standup (sidebar) has the editable draft, Copy, and "Mark as posted", plus a short history.
- Checked live on the dev data: one task done with its Jira and GitHub links, one up next, and both meeting tasks excluded.
