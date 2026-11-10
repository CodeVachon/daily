---
id: 5
title: "Daily v1: personal task manager for me and my agents"
state: Todo
labels: [epic]
created: 2026-11-10T00:33:51Z
updated: 2026-11-10T00:44:10Z
---

## Description

A personal todo/task manager. Tasks arrive from Claude (Claude Code) and Codex through the MCP server, and agents read them back the same way. I triage them on a Kanban board. Single user (the GitHub allowlist), served on the tailnet.

## Requirements

### R1 Tasks
- Fields: title, description (Markdown), status, priority, due date (optional, date with optional time), project (optional), labels (0..n), created/updated timestamps, created-by / updated-by actor.
- **Status**: fixed set for v1: Backlog, Todo, In Progress, Blocked, Done, Cancelled. Stored as data (a status table with key, name, category open|active|done|cancelled, and board order), not an enum, so more can be added later without code changes. Agents reason about the *category*, not the name.
- **Priority**: No priority, Urgent, High, Medium, Low (Linear-style; maps to Linear/Jira priorities).
- **Projects**: group tasks; the board and lists can filter by project.
- **Labels**: free-form, filterable, colour per label.
- **Subtasks / checklist**: checklist items on a task (text, done, order). Subtasks are tasks with a parent task.
- **Dependencies**: a task can be "blocked by" other tasks; cycles are rejected; open blockers are shown on the card.
- **Comments**: Markdown comments with an author (actor). Edits are recorded, and history is preserved.

### R2 Actors and history ("who/what changed it")
- Every write records an **actor**: me (user, via the web UI) or an **agent** (the OAuth client that called MCP, e.g. "Claude Code" or "Codex", resolved from the token's client id/name), plus the user it acts for.
- Every change appends an **activity event**: task created, field changed (old → new), status moved, comment added/edited, link added/removed/synced, checklist and dependency changes. It is written in the same transaction as the change.
- The activity timeline is shown on each task and is available through MCP.

### R3 Kanban board
- Columns = statuses in board order (Cancelled hidden by default). Cards show title, priority, due date (overdue highlighted), labels, project, link badges (provider + state), blocked indicator, and an unread dot.
- Drag and drop between columns changes status; drag within a column changes manual order. Both are recorded as activity.
- Filters: project, label, priority, due (overdue / this week), search text.

### R4 Real-time and unread
- The board and task pages update live (no reload) when anything changes, including agent changes (SSE from the server).
- **Unread**: a task is unread when it has activity by an actor other than me since I last viewed it. Unread dot on cards, plus an **Updates inbox** listing recent agent changes, with mark-read.

### R5 External links with live sync
- Link 1..n items per task: **GitHub issues/PRs, Jira tickets, Linear issues**. Paste a URL (or an agent sends one); detect provider and key (`owner/repo#123`, `PROJ-42`, `ENG-7`).
- **Per-provider OAuth**: connect GitHub, Atlassian (Jira Cloud) and Linear from a Settings page. Tokens are stored encrypted in the database (key from varlock); refresh tokens are handled.
- **Live sync by polling** (the app is tailnet-only, so there are no webhooks): a background worker refreshes the cached title, state (open/closed/merged/draft, Jira status, Linear state), assignee and updated-at every few minutes, plus on demand (task opened, or an agent request). Sync errors are shown on the link. State changes are recorded as activity (actor = the "sync" system actor).

### R6 Notifications
- **Web Push / PWA**: installable app; push to desktop and phone when an agent creates or changes a task. Per-event preferences, quiet by default for my own changes.
- **Slack daily standup**: generate a standup update (done since the last standup, in progress, up next / due soon, blocked) from tasks and activity. Preview and edit it in the UI, then post it to a Slack channel (Slack OAuth app, `chat:write`). Optionally on a schedule. Also available as an MCP tool so an agent can draft it.

### R7 MCP parity (AGENTS.md rule)
Every capability above has MCP tools: create/update/get/list/search tasks, move status, comments, checklist, dependencies, projects/labels, links (add/remove/refresh), activity/updates since, and the standup draft. All writes are attributed to the calling agent.

## Non-goals (v1)

Multi-user/sharing, recurring tasks, time tracking, two-way write-back to GitHub/Jira/Linear (read-only sync), webhooks/public exposure, email.

## Conventions

Data only via `@workspace/db` services (single source of truth). Every feature ships MCP tools and tests. UI from shadcn components. Commit rules in AGENTS.md.

## Plan

Delivered as epics (children of this issue), ordered by blockers:
1. Task core domain (schema + services + actor/activity) — foundation for everything.
2. Task MCP tools (agents in/out).
3. Web UI: task list/detail + Kanban.
4. Real-time + unread/inbox.
5. External links + per-provider OAuth + polling sync (needs a worker process).
6. Notifications: Web Push/PWA + Slack standup.
`motte next` picks up work in dependency order.

## Notes

### 2026-11-10T00:35:38Z — claude-code (agent)

Planning decisions (from the Q&A with Chris, 2026-11-09): fixed statuses stored as data so more can be added later; Urgent/High/Medium/Low priority; live sync now via per-provider OAuth and polling (tailnet-only, so no webhooks); push = Web Push/PWA; Slack is used to post a daily standup update; v1 includes labels, projects, checklist + subtasks, and dependencies.

Assumptions to confirm, and open questions:
1. Agents can do everything I can, including delete (soft delete, restorable). Should deletes or Done/Cancelled by agents need confirmation?
2. Timezone for due dates and the standup window: a user setting, default to the machine timezone.
3. GitHub sync for private repos needs the broad `repo` OAuth scope; a GitHub App would allow finer read-only access. Decide in #38.
4. Slack posts as a bot into a chosen channel (vs as me with a user token). Decide in #45.
5. Codex must support OAuth for streamable-HTTP MCP servers; verify early in #20.
6. Production runtime (web + worker always on this machine: launchd/pm2/docker) is not planned yet; add it when the worker lands (#40).

### 2026-11-10T00:44:10Z — claude-code (agent)

Answers from Chris (2026-11-09):
1. Agents cannot delete data; only I can (soft delete, restorable). Interpretation: removing any entity (task, comment, checklist item, link, dependency, project, label) requires a user actor, enforced in the db services. Agents can still edit fields, including setting status to Done/Cancelled. No delete tools in MCP.
2. Use the browser's timezone. Postgres stores every timestamp as timestamptz in UTC; the browser timezone drives display, due dates and the standup window. New story added under #6.
3. Sign-in OAuth app setup instructions go in the README (done with this change). The same GitHub OAuth App can request `repo` later from the Integrations connect flow (scopes are requested at authorize time, not configured on the app).
4. Slack posts come from a bot using message templates I manage, and must @mention me (Slack user id) so other bots know the message is about me. Template story added under #11.
5. Codex support is lowest priority (I use Claude 95% of the time): split out as a separate low-priority issue.
6. We will deploy to DigitalOcean: new deployment epic added.
