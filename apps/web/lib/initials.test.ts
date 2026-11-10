import { describe, expect, it } from "vitest"

import { initials } from "./initials"

describe("initials", () => {
  it("uses the first and last name", () => {
    expect(initials("Octo Cat")).toBe("OC")
    expect(initials("  ada  byron lovelace ")).toBe("AL")
  })

  it("uses one letter for a single name, ? for none", () => {
    expect(initials("codevachon")).toBe("C")
    expect(initials("   ")).toBe("?")
  })
})
