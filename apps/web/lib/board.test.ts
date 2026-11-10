import type { TaskSummary } from "@workspace/db/core"
import { describe, expect, it } from "vitest"

import { boardItems, dropTarget, groupByStatus, toBoardCard } from "./board"

const statuses = [
  { key: "todo", name: "Todo", category: "open" },
  { key: "done", name: "Done", category: "done" },
  { key: "cancelled", name: "Cancelled", category: "cancelled" },
]
const task = (title: string, key: string) =>
  ({ id: title, title, status: { key } }) as unknown as TaskSummary

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
    expect(boardItems(groupByStatus(statuses, tasks))).toEqual({
      todo: ["a", "c"],
      done: ["b"],
    })
  })

  it("can show the cancelled column", () => {
    expect(
      groupByStatus(statuses, tasks, { showCancelled: true })
        .at(-1)
        ?.tasks.map((t) => t.title)
    ).toEqual(["d"])
  })
})

describe("toBoardCard", () => {
  const base = {
    id: "t1",
    number: 7,
    title: "Ship",
    priority: "high",
    status: { key: "todo", category: "open" },
    project: { id: "p", name: "Appello", color: "blue" },
    labels: [{ id: "l", name: "work", color: "green" }],
    openBlockers: 1,
    progress: {
      checklist: { done: 1, total: 3 },
      subtasks: { done: 0, total: 0 },
    },
  }
  const now = new Date("2026-11-13T15:00:00Z") // Fri 10:00 ET

  it("flags overdue and due-today in the user's zone", () => {
    const overdue = toBoardCard(
      {
        ...base,
        due: { kind: "date", date: "2026-11-12" },
      } as unknown as TaskSummary,
      now,
      "America/Toronto"
    )
    expect(overdue).toMatchObject({
      number: 7,
      due: { label: "Thu, Nov 12", overdue: true, today: false },
      project: { name: "Appello", color: "blue" },
      labels: [{ name: "work", color: "green" }],
      openBlockers: 1,
      checklist: { done: 1, total: 3 },
      subtasks: null,
    })
    const today = toBoardCard(
      {
        ...base,
        due: { kind: "date", date: "2026-11-13" },
      } as unknown as TaskSummary,
      now,
      "America/Toronto"
    )
    expect(today.due).toMatchObject({ overdue: false, today: true })
  })

  it("never flags finished tasks", () => {
    const done = toBoardCard(
      {
        ...base,
        status: { key: "done", category: "done" },
        due: { kind: "date", date: "2026-11-01" },
      } as unknown as TaskSummary,
      now,
      "America/Toronto"
    )
    expect(done.due).toMatchObject({ overdue: false, today: false })
    expect(
      toBoardCard({ ...base, due: null } as unknown as TaskSummary, now, "UTC")
        .due
    ).toBeNull()
  })
})

describe("dropTarget", () => {
  const before = { todo: ["a", "b", "c"], done: ["d"] }

  it("reports a reorder within a column with its neighbours", () => {
    expect(
      dropTarget(before, { todo: ["b", "a", "c"], done: ["d"] }, "a")
    ).toEqual({
      status: "todo",
      afterTaskId: "b",
      beforeTaskId: "c",
    })
  })

  it("reports a move to another column, including into an empty one", () => {
    expect(
      dropTarget(before, { todo: ["a", "c"], done: ["d", "b"] }, "b")
    ).toEqual({
      status: "done",
      afterTaskId: "d",
      beforeTaskId: null,
    })
    expect(
      dropTarget({ todo: ["a"], done: [] }, { todo: [], done: ["a"] }, "a")
    ).toEqual({
      status: "done",
      afterTaskId: null,
      beforeTaskId: null,
    })
  })

  it("is null when nothing moved", () => {
    expect(dropTarget(before, before, "b")).toBeNull()
    expect(dropTarget(before, before, "missing")).toBeNull()
  })
})
