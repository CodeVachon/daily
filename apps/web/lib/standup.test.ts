import { describe, expect, it } from "vitest"

import { sinceLabel } from "./standup"

const since = new Date("2026-11-11T14:30:00Z")

describe("sinceLabel", () => {
  it("names the last standup when the draft starts there", () => {
    expect(sinceLabel(since, since, "America/Toronto")).toBe(
      "Since your last standup (Wed, Nov 11, 9:30 AM ET)"
    )
  })

  it("otherwise says it's the previous working day", () => {
    expect(sinceLabel(since, null, "America/Toronto")).toBe(
      "Since Wed, Nov 11, 9:30 AM ET, the start of the previous working day"
    )
  })
})
