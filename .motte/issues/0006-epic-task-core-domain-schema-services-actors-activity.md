---
id: 6
title: "Epic: Task core domain (schema, services, actors, activity)"
state: Done
parent: 5
labels: [epic, db]
created: 2026-11-10T00:33:59Z
updated: 2026-11-10T01:21:30Z
---

## Description

R1 + R2 from #5. Schema and `@workspace/db` services for tasks, statuses, priorities, projects, labels, checklist, subtasks, dependencies and comments, plus the actor model and activity events written in the same transaction as every change. Everything else depends on this.

## Notes

### 2026-11-10T01:21:30Z — Christopher Vachon (user)

Epic complete (2026-11-09). @workspace/db now provides: actor model + deletion policy (#12), timezone rules (#46), task schema (#13), activity history (#14), tasks service (#15), comments (#16), checklist + subtasks (#17), dependencies (#18), projects + labels (#19). 152 tests on PGlite; migrations 0002-0008 applied locally. Unblocks MCP tools (#7), web UI (#8), real-time (#9), links (#10).
