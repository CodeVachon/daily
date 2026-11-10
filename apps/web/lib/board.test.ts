import type { TaskSummary } from "@workspace/db/core"
import { describe, expect, it } from "vitest"

import { groupByStatus } from "./board"

const statuses = [
  { key: "todo", name: "Todo", category: "open" },
  { key: "done", name: "Done", category: "done" },
  { key: "cancelled", name: "Cancelled", category: "cancelled" },
]
const task = (title: string, key: string) =>
  ({ title, status: { key } }) as unknown as TaskSummary

describe("groupByStatus", () => {
  const tasks = [
    task("a", "todo"),
    task("b", "done"),
    task("c", "todo"),
    task("d", "cancelled"),
  ]

  it("groups tasks into status columns, keeping their order", () => {
    expect(
      groupByStatus(statuses, tasks).map((c) => [
        c.status.key,
        c.tasks.map((t) => t.title),
      ])
    ).toEqual([
      ["todo", ["a", "c"]],
      ["done", ["b"]],
    ])
  })

  it("can show the cancelled column", () => {
    expect(
      groupByStatus(statuses, tasks, { showCancelled: true })
        .at(-1)
        ?.tasks.map((t) => t.title)
    ).toEqual(["d"])
  })
})
