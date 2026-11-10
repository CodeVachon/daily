---
id: 43
title: Web Push subscriptions and agent-change notifications
state: Todo
parent: 11
labels: [notifications, db]
blockedBy: [33, 42]
created: 2026-11-10T00:35:16Z
updated: 2026-11-10T00:35:27Z
---

## Description

Push to my devices when an agent creates or changes a task (not for my own changes), with simple preferences.

## Plan

- VAPID keys via varlock (sensitive). `push_subscription` (user_id, endpoint, keys, device label, created, last_success, failures).
- services.push: subscribe/unsubscribe/list; sender (web-push lib) driven by the change feed (#9), coalescing bursts per task.
- Preferences: agent creates, agent status changes, comments, link state changes, due soon.
- Settings UI to enable per device and send a test notification. Tests for the event → notification decision logic.
