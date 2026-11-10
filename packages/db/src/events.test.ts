import { describe, expect, it } from "vitest"

import { describeEvent, diffFields } from "./events"

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

describe("describeEvent", () => {
  it("describes every kind of change in plain words", () => {
    expect(describeEvent({ type: "created" })).toBe("created the task")
    expect(
      describeEvent({ type: "status_changed", from: "todo", to: "done" })
    ).toBe("moved it from todo to done")
    expect(
      describeEvent({
        type: "updated",
        changes: [
          { field: "title", from: "A", to: "B" },
          {
            field: "due",
            from: null,
            to: { kind: "date", date: "2026-11-14" },
          },
          { field: "description", from: "x", to: "y" },
        ],
      })
    ).toBe(
      'changed title from "A" to "B"; changed due date from nothing to 2026-11-14; edited the description'
    )
    expect(
      describeEvent({
        type: "checklist_toggled",
        itemId: "i",
        text: "Tag",
        done: true,
      })
    ).toBe('checked "Tag"')
    expect(
      describeEvent({ type: "label_added", labelId: "l", name: "Work" })
    ).toBe('added label "Work"')
    expect(
      describeEvent({
        type: "link_synced",
        linkId: "l",
        changes: [{ field: "state", from: "open", to: "merged" }],
      })
    ).toBe('synced a link: changed state from "open" to "merged"')
  })
})
