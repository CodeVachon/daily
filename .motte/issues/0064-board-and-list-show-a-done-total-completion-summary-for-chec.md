---
id: 64
title: "Board and list: show a (done/total) completion summary for checklist items and subtasks"
state: Done
assignee: Christopher Vachon
created: 2026-11-10T03:29:00Z
updated: 2026-11-10T03:33:32Z
---

## Plan

When a task has checklist items or subtasks, show one combined summary like (2/3) after its title on board cards and Tasks list rows. Combine live checklist items + non-cancelled subtasks (the existing TaskSummary.progress). Pure helper in apps/web/lib/board.ts (tested), used by toBoardCard and toTaskRow; a tooltip/title breaks it down. No service/MCP change: progress is already exposed by list_tasks/get_task.

## Notes

### 2026-11-10T03:33:32Z — Christopher Vachon (user)

Shipped: completionSummary() in apps/web/lib/board.ts combines live checklist items + non-cancelled subtasks (existing TaskSummary.progress) into {done,total,label:'(2/3)',detail}. BoardCard.completion replaces the separate checklist/subtask badges (they would duplicate the count); TaskRowView.completion too. CompletionSummary component renders the label after the title with a Tooltip breakdown, green when all done. No MCP change: list_tasks/get_task already return progress.checklist and progress.subtasks. ui-shot seed now adds checklist items + a subtask to #3. Verified via screenshots of /board and /tasks.
