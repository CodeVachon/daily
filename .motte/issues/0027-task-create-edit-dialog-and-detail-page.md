---
id: 27
title: "Task create/edit: dialog and detail page"
state: Done
parent: 8
assignee: Christopher Vachon
labels: [web]
blockedBy: [15, 19, 26]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T01:48:43Z
---

## Description

Quick-create dialog (title, priority, due, project, labels) and a full task detail page with inline-editable fields and a Markdown description.

## Plan

- shadcn dialog, form, input, textarea, select, popover + calendar (due date), command (label/project pickers), badge.
- Markdown render (react-markdown) and editor (textarea with preview tabs).
- Detail sections: fields, description, checklist, subtasks, blockers, comments, activity timeline (actor avatar/agent badge), links (placeholder until #10).

## Notes

### 2026-11-10T01:48:43Z — Christopher Vachon (user)

Done: NewTaskDialog on the board (title, Markdown description, status, priority, due date+optional time, project, labels with get-or-create), task detail page /tasks/[number] with TaskEditor (inline title save on blur/Enter; status/priority/due/project/labels save on change; DescriptionEditor with Write/Preview tabs, react-markdown + remark-gfm + Tailwind Typography). Board cards link to detail. Server actions in app/(app)/tasks/actions.ts (createTaskAction, updateTaskAction, ensureLabelAction) via runAsUser + refresh(); due strings parsed server-side in the user's stored zone. Pure helpers in lib/task-form.ts (priority options, dueToForm/dueFromForm, calendar date conversion, labels) with tests; lib/task-options.ts loads choices. shadcn added: dialog, select (base-ui items prop for labels), textarea, popover, calendar, command, label, tabs, field. ui:shot gained --click=<button name> + browser error logging (rewritten; earlier edits had silently not applied after prettier reflow). Verified: screenshots of detail page + dialog, and a one-off Playwright interaction (create via dialog appears on board; rename on detail page recorded as 'updated').
