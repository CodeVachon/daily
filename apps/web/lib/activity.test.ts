import type { TaskEvent } from "@workspace/db/core"
import { describe, expect, it } from "vitest"

import { relativeTime, toTimeline } from "./activity"

const now = new Date("2026-11-13T15:00:00Z")
const ago = (seconds: number) => new Date(+now - seconds * 1000)

describe("relativeTime", () => {
  it("describes recent and older times", () => {
    expect(relativeTime(ago(10), now)).toBe("just now")
    expect(relativeTime(ago(5 * 60), now)).toBe("5 minutes ago")
    expect(relativeTime(ago(3 * 3600), now)).toBe("3 hours ago")
    expect(relativeTime(ago(26 * 3600), now)).toBe("yesterday")
    expect(relativeTime(ago(15 * 24 * 3600), now)).toBe("2 weeks ago")
  })
})

describe("toTimeline", () => {
  it("names actors, uses status names and formats times in the user's zone", () => {
    const events: TaskEvent[] = [
      {
        seq: 2,
        taskId: "t",
        at: ago(120),
        actor: {
          type: "agent",
          userId: "u",
          clientId: "c",
          label: "Claude Code",
        },
        payload: { type: "status_changed", from: "todo", to: "in_progress" },
      },
      {
        seq: 1,
        taskId: "t",
        at: ago(3600),
        actor: { type: "user", userId: "u", clientId: null, label: "Chris" },
        payload: { type: "created" },
      },
    ]
    expect(
      toTimeline(events, {
        now,
        timezone: "America/Vancouver",
        statusNames: { todo: "Todo", in_progress: "In Progress" },
      })
    ).toEqual([
      {
        id: 2,
        actorType: "agent",
        actorName: "Claude Code",
        text: "moved it from Todo to In Progress",
        relative: "2 minutes ago",
        exact: "Nov 13, 2026, 6:58 AM",
      },
      {
        id: 1,
        actorType: "user",
        actorName: "Chris",
        text: "created the task",
        relative: "1 hour ago",
        exact: "Nov 13, 2026, 6:00 AM",
      },
    ])
  })
})
