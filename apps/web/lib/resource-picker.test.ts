import { describe, expect, it } from "vitest"

import {
  filterResources,
  isDirty,
  selectedFirst,
  selectionLabel,
  toggle,
} from "./resource-picker"

const r = (
  externalId: string,
  key: string,
  description: string | null = null
) => ({ externalId, key, name: key, description })

const repos = [
  r("1", "codevachon/daily", "Personal task manager"),
  r("2", "useAnzen/app", null),
  r("3", "useAnzen/docs", "Help centre"),
]

describe("filterResources", () => {
  it("keeps everything for an empty query", () => {
    expect(filterResources(repos, "  ")).toBe(repos)
  })

  it("matches every word against key, name and description", () => {
    expect(filterResources(repos, "anzen").map((x) => x.key)).toEqual([
      "useAnzen/app",
      "useAnzen/docs",
    ])
    expect(filterResources(repos, "ANZEN help").map((x) => x.key)).toEqual([
      "useAnzen/docs",
    ])
    expect(filterResources(repos, "task")).toEqual([repos[0]])
  })
})

describe("selection", () => {
  it("toggles without mutating", () => {
    const start = new Set(["1"])
    expect([...toggle(start, "2")]).toEqual(["1", "2"])
    expect([...toggle(start, "1")]).toEqual([])
    expect([...start]).toEqual(["1"])
  })

  it("knows when the selection changed", () => {
    expect(isDirty(["1", "2"], new Set(["2", "1"]))).toBe(false)
    expect(isDirty(["1"], new Set(["1", "2"]))).toBe(true)
    expect(isDirty(["1", "2"], new Set(["1", "3"]))).toBe(true)
  })

  it("puts saved resources first", () => {
    expect(selectedFirst(repos, ["3"]).map((x) => x.externalId)).toEqual([
      "3",
      "1",
      "2",
    ])
  })
})

describe("selectionLabel", () => {
  const noun = { one: "project", many: "projects" }
  it("pluralizes", () => {
    expect(selectionLabel(0, noun)).toBe("0 projects selected")
    expect(selectionLabel(1, noun)).toBe("1 project selected")
    expect(selectionLabel(2, noun)).toBe("2 projects selected")
  })
})
