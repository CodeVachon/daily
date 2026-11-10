import { describe, expect, it } from "vitest"

import { diffFields } from "./events"

describe("diffFields", () => {
  const before = {
    title: "A",
    priority: "none",
    dueAt: new Date("2026-11-13T22:00:00Z"),
    tags: ["x"],
  }

  it("reports only changed fields, old → new", () => {
    expect(diffFields(before, { title: "B", priority: "none" })).toEqual([
      { field: "title", from: "A", to: "B" },
    ])
  })

  it("compares dates by instant and arrays by value", () => {
    expect(
      diffFields(before, {
        dueAt: new Date("2026-11-13T22:00:00Z"),
        tags: ["x"],
      })
    ).toEqual([])
    expect(diffFields(before, { tags: ["x", "y"] })).toEqual([
      { field: "tags", from: ["x"], to: ["x", "y"] },
    ])
  })

  it("normalizes missing values to null", () => {
    expect(
      diffFields<{ due: string | null }>({ due: null }, { due: "2026-11-13" })
    ).toEqual([{ field: "due", from: null, to: "2026-11-13" }])
    expect(
      diffFields<{ due?: string }>({ due: "2026-11-13" }, { due: undefined })
    ).toEqual([{ field: "due", from: "2026-11-13", to: null }])
  })
})
