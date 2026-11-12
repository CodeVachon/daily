import type { InboxItem } from "@workspace/db/core"
import { describe, expect, it } from "vitest"

import { toUpdates } from "./updates"

const event = (seq: number) => ({
  seq,
  taskId: "t1",
  at: new Date("2026-11-10T12:00:00Z"),
  actor: {
    type: "agent" as const,
    userId: "u",
    clientId: "claude-code",
    label: "Claude Code",
  },
  payload: { type: "comment_added" as const, commentId: "c" },
})

const item: InboxItem = {
  task: { id: "t1", number: 12, title: "Ship it", statusKey: "in_progress" },
  unread: 4,
  events: [event(9), event(8)],
  latestAt: new Date("2026-11-10T12:00:00Z"),
}

describe("toUpdates", () => {
  it("shows the status name, newest entries and how many more", () => {
    const [view] = toUpdates([item], {
      now: new Date("2026-11-10T12:05:00Z"),
      timezone: "America/Toronto",
      statusNames: { in_progress: "In Progress" },
    })
    expect(view).toMatchObject({
      taskId: "t1",
      number: 12,
      title: "Ship it",
      status: "In Progress",
      unread: 4,
      more: 2,
    })
    expect(view!.entries.map((e) => [e.actorName, e.text])).toEqual([
      ["Claude Code", "commented"],
      ["Claude Code", "commented"],
    ])
  })

  it("falls back to the status key", () => {
    const [view] = toUpdates([{ ...item, unread: 2 }], {
      now: new Date(),
      timezone: "UTC",
      statusNames: {},
    })
    expect(view!.status).toBe("in_progress")
    expect(view!.more).toBe(0)
  })
})
