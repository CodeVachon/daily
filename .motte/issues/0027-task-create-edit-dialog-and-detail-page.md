---
id: 27
title: "Task create/edit: dialog and detail page"
state: Todo
parent: 8
labels: [web]
blockedBy: [15, 19, 26]
created: 2026-11-10T00:34:43Z
updated: 2026-11-10T00:35:25Z
---

## Description

Quick-create dialog (title, priority, due, project, labels) and a full task detail page with inline-editable fields and a Markdown description.

## Plan

- shadcn dialog, form, input, textarea, select, popover + calendar (due date), command (label/project pickers), badge.
- Markdown render (react-markdown) and editor (textarea with preview tabs).
- Detail sections: fields, description, checklist, subtasks, blockers, comments, activity timeline (actor avatar/agent badge), links (placeholder until #10).
