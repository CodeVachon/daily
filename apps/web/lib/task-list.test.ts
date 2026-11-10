import type { TaskSummary } from "@workspace/db/core"
import { describe, expect, it } from "vitest"

import { toTaskRow } from "./task-list"

const now = new Date("2026-11-13T15:00:00Z")
const base = {
  id: "t1",
  number: 7,
  title: "Ship",
  priority: "high",
  status: { key: "todo", name: "Todo", category: "open" },
  due: { kind: "date", date: "2026-11-12" },
  project: { id: "p", name: "Appello", color: "blue" },
  labels: [{ id: "l", name: "work", color: "green" }],
  openBlockers: 0,
  progress: {
    checklist: { done: 0, total: 0 },
    subtasks: { done: 0, total: 0 },
  },
  updatedAt: new Date("2026-11-13T14:00:00Z"),
} as unknown as TaskSummary

describe("toTaskRow", () => {
  it("shows the row's values in the user's zone", () => {
    expect(toTaskRow(base, now, "America/Toronto")).toEqual({
      id: "t1",
      number: 7,
      title: "Ship",
      completion: null,
      status: "Todo",
      priority: "High",
      due: "Thu, Nov 12",
      overdue: true,
      projects: [{ name: "Appello", color: "blue" }],
      labels: [{ name: "work", color: "green" }],
      updated: "1 hour ago",
    })
  })

  it("summarises checklist items and subtasks done", () => {
    const row = toTaskRow(
      {
        ...base,
        progress: {
          checklist: { done: 2, total: 2 },
          subtasks: { done: 0, total: 1 },
        },
      } as unknown as TaskSummary,
      now,
      "UTC"
    )
    expect(row.completion?.label).toBe("(2/3)")
  })

  it("leaves empty cells blank", () => {
    const row = toTaskRow(
      {
        ...base,
        priority: "none",
        due: null,
        project: null,
        labels: [],
      } as unknown as TaskSummary,
      now,
      "UTC"
    )
    expect(row).toMatchObject({
      priority: "",
      due: "",
      overdue: false,
      projects: [],
      labels: [],
    })
  })
})
