import { describe, expect, it } from "vitest"

import { isActive } from "./nav"

describe("isActive", () => {
  it("matches the page and pages under it", () => {
    expect(isActive("/board", "/board")).toBe(true)
    expect(isActive("/tasks", "/tasks/12")).toBe(true)
    expect(isActive("/board", "/boards")).toBe(false)
    expect(isActive("/board", "/")).toBe(false)
  })
})
