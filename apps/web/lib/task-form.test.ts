import { describe, expect, it } from "vitest"

import {
  dueFormLabel,
  dueFromForm,
  dueToForm,
  EMPTY_DUE,
  fromCalendarDate,
  taskHref,
  toCalendarDate,
} from "./task-form"

describe("due form", () => {
  it("round-trips an all-day date", () => {
    const form = dueToForm(
      { kind: "date", date: "2026-11-14" },
      "America/Vancouver"
    )
    expect(form).toEqual({ date: "2026-11-14", time: "" })
    expect(dueFromForm(form)).toBe("2026-11-14")
  })

  it("shows a fixed time in the user's current zone", () => {
    const due = {
      kind: "instant" as const,
      at: new Date("2026-11-14T22:00:00Z"),
      timezone: "America/Toronto",
    }
    expect(dueToForm(due, "America/Toronto")).toEqual({
      date: "2026-11-14",
      time: "17:00",
    })
    expect(dueToForm(due, "America/Vancouver")).toEqual({
      date: "2026-11-14",
      time: "14:00",
    })
    expect(dueToForm(due, "Asia/Tokyo")).toEqual({
      date: "2026-11-15",
      time: "07:00",
    })
    expect(dueFromForm({ date: "2026-11-14", time: "14:00" })).toBe(
      "2026-11-14T14:00"
    )
  })

  it("clears when there is no date", () => {
    expect(dueToForm(null, "UTC")).toEqual(EMPTY_DUE)
    expect(dueFromForm(EMPTY_DUE)).toBeNull()
    expect(dueFromForm({ date: "", time: "09:00" })).toBeNull()
  })
})

describe("taskHref", () => {
  it("links by task number", () => {
    expect(taskHref(12)).toBe("/tasks/12")
  })
})

describe("calendar helpers", () => {
  it("convert between picked dates and YYYY-MM-DD", () => {
    expect(toCalendarDate(new Date(2026, 10, 4))).toBe("2026-11-04")
    expect(fromCalendarDate("2026-11-04")).toEqual(new Date(2026, 10, 4))
    expect(fromCalendarDate("")).toBeUndefined()
  })

  it("label the picker button", () => {
    expect(dueFormLabel({ date: "2026-11-14", time: "" })).toBe("Sat, Nov 14")
    expect(dueFormLabel({ date: "2026-11-14", time: "17:00" })).toBe(
      "Sat, Nov 14 · 17:00"
    )
    expect(dueFormLabel(EMPTY_DUE)).toBeNull()
  })
})
