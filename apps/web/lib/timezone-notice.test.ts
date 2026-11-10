import { describe, expect, it } from "vitest"

import { timezoneNotice } from "./timezone-notice"

const at = new Date("2026-11-13T12:00:00Z")

describe("timezoneNotice", () => {
  it("announces travel to a new zone", () => {
    expect(
      timezoneNotice(
        {
          timezone: "America/Vancouver",
          previous: "America/Toronto",
          changed: true,
        },
        at
      )
    ).toBe("Times now shown in Pacific Time")
  })

  it("stays quiet on the first report, no change, or when signed out", () => {
    expect(
      timezoneNotice(
        { timezone: "America/Toronto", previous: null, changed: true },
        at
      )
    ).toBeNull()
    expect(
      timezoneNotice(
        {
          timezone: "America/Toronto",
          previous: "America/Toronto",
          changed: false,
        },
        at
      )
    ).toBeNull()
    expect(timezoneNotice(null, at)).toBeNull()
  })
})
