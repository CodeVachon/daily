import { describe, expect, it } from "vitest"

import {
  hasFilters,
  parseFilters,
  serializeFilters,
  toListInput,
} from "./filters"

describe("parseFilters", () => {
  it("reads every filter from search params", () => {
    expect(
      parseFilters({
        q: " invoices ",
        project: "p1",
        label: "l1",
        priority: "urgent,high,bogus",
        due: "overdue",
        cancelled: "1",
        sort: "due",
      })
    ).toEqual({
      q: "invoices",
      project: "p1",
      label: "l1",
      priority: ["urgent", "high"],
      due: "overdue",
      cancelled: true,
      sort: "due",
    })
  })

  it("ignores junk and empty values", () => {
    expect(
      parseFilters({
        q: "  ",
        due: "someday",
        sort: "random",
        priority: ["low", "high"],
      })
    ).toEqual({
      q: undefined,
      project: undefined,
      label: undefined,
      priority: ["low"],
      due: undefined,
      cancelled: false,
      sort: undefined,
    })
  })
})

describe("serializeFilters", () => {
  it("round-trips", () => {
    const filters = parseFilters({
      q: "a b",
      priority: "urgent",
      due: "week",
      cancelled: "1",
    })
    const query = serializeFilters(filters)
    expect(query).toBe("q=a+b&priority=urgent&due=week&cancelled=1")
    expect(
      parseFilters(Object.fromEntries(new URLSearchParams(query)))
    ).toEqual(filters)
    expect(serializeFilters(parseFilters({}))).toBe("")
  })
})

describe("toListInput", () => {
  it("maps to a service query, hiding cancelled tasks unless asked", () => {
    expect(
      toListInput(parseFilters({ q: "x", priority: "high", sort: "updated" }))
    ).toEqual({
      text: "x",
      projectId: undefined,
      labelId: undefined,
      priority: ["high"],
      due: undefined,
      status: ["open", "active", "done"],
      orderBy: "updated",
      limit: 200,
    })
    expect(toListInput(parseFilters({ cancelled: "1" }))).toMatchObject({
      status: undefined,
      orderBy: "board",
    })
  })

  it("knows when any filter is active", () => {
    expect(hasFilters(parseFilters({}))).toBe(false)
    expect(hasFilters(parseFilters({ due: "today" }))).toBe(true)
  })
})
