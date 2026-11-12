import { describe, expect, it } from "vitest"

import {
  calendarDateIn,
  dayInterval,
  dueDeadline,
  formatDue,
  isDueToday,
  isOverdue,
  isValidTimeZone,
  isWeekStart,
  parseDue,
  timeZoneLabel,
  todayInterval,
  WEEK_STARTS,
  weekInterval,
  weekStartName,
  weekStartNamed,
  type Due,
} from "./time"

const ET = "America/Toronto"
const PT = "America/Vancouver"

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(isValidTimeZone(ET)).toBe(true)
    expect(isValidTimeZone("UTC")).toBe(true)
    expect(isValidTimeZone("Mars/Olympus")).toBe(false)
  })
})

describe("calendarDateIn", () => {
  // 2026-11-14 03:30 UTC is still the 13th on both coasts.
  const at = new Date("2026-11-14T03:30:00Z")

  it("depends on the zone", () => {
    expect(calendarDateIn(at, "UTC")).toBe("2026-11-14")
    expect(calendarDateIn(at, ET)).toBe("2026-11-13")
    expect(calendarDateIn(at, PT)).toBe("2026-11-13")
  })

  it("rejects unknown zones", () => {
    expect(() => calendarDateIn(at, "Nope/Nope")).toThrow(RangeError)
  })
})

describe("dayInterval", () => {
  it("spans local midnight to midnight", () => {
    expect(dayInterval("2026-11-13", ET)).toEqual({
      start: new Date("2026-11-13T05:00:00Z"),
      end: new Date("2026-11-14T05:00:00Z"),
    })
  })

  it("is 23h on spring-forward and 25h on fall-back days", () => {
    const spring = dayInterval("2026-03-08", ET)
    expect(+spring.end - +spring.start).toBe(23 * 3600_000)
    const fall = dayInterval("2026-11-01", ET)
    expect(+fall.end - +fall.start).toBe(25 * 3600_000)
  })

  it("rejects malformed dates", () => {
    expect(() => dayInterval("Nov 13", ET)).toThrow(RangeError)
  })
})

describe("todayInterval / weekInterval", () => {
  const now = new Date("2026-11-13T15:00:00Z") // Fri 10:00 ET / 07:00 PT

  it("today follows the current zone", () => {
    expect(todayInterval(now, PT)).toEqual(dayInterval("2026-11-13", PT))
  })

  it("weeks start on the chosen day in the given zone", () => {
    expect(weekInterval(now, ET, 1)).toEqual({
      start: new Date("2026-11-09T05:00:00Z"),
      end: new Date("2026-11-16T05:00:00Z"),
    })
    expect(weekInterval(now, ET, 0)).toEqual({
      start: new Date("2026-11-08T05:00:00Z"),
      end: new Date("2026-11-15T05:00:00Z"),
    })
    expect(weekInterval(now, ET, 6)).toEqual({
      start: new Date("2026-11-07T05:00:00Z"),
      end: new Date("2026-11-14T05:00:00Z"),
    })
  })

  it("knows which days a week can start on", () => {
    expect([0, 1, 6].every(isWeekStart)).toBe(true)
    expect([2, 7, "1", null].some(isWeekStart)).toBe(false)
    expect(WEEK_STARTS.map(weekStartName)).toEqual([
      "Sunday",
      "Monday",
      "Saturday",
    ])
    expect(weekStartNamed("monday")).toBe(1)
    expect(weekStartNamed("Saturday")).toBe(6)
    expect(weekStartNamed("friday")).toBeNull()
  })
})

describe("due dates while travelling", () => {
  const friday: Due = { kind: "date", date: "2026-11-13" }
  // 5pm Eastern on Friday, set while in Toronto.
  const fivePmEt: Due = {
    kind: "instant",
    at: new Date("2026-11-13T22:00:00Z"),
    timezone: ET,
  }

  it("a floating date ends at local midnight wherever I am", () => {
    expect(dueDeadline(friday, ET)).toEqual(new Date("2026-11-14T05:00:00Z"))
    expect(dueDeadline(friday, PT)).toEqual(new Date("2026-11-14T08:00:00Z"))
  })

  it("is overdue on the east coast but not yet on the west coast", () => {
    const now = new Date("2026-11-14T06:00:00Z") // 1am Sat ET, 10pm Fri PT
    expect(isOverdue(friday, now, ET)).toBe(true)
    expect(isOverdue(friday, now, PT)).toBe(false)
  })

  it("an instant is the same moment on both coasts", () => {
    expect(dueDeadline(fivePmEt, PT)).toEqual(fivePmEt.at)
    const now = new Date("2026-11-13T22:30:00Z")
    expect(isOverdue(fivePmEt, now, ET)).toBe(true)
    expect(isOverdue(fivePmEt, now, PT)).toBe(true)
  })

  it("due today means before the end of today and not past", () => {
    const morning = new Date("2026-11-13T15:00:00Z")
    expect(isDueToday(friday, morning, ET)).toBe(true)
    expect(isDueToday(fivePmEt, morning, PT)).toBe(true)
    expect(isDueToday({ kind: "date", date: "2026-11-16" }, morning, ET)).toBe(
      false
    )
    expect(isDueToday(fivePmEt, new Date("2026-11-13T23:00:00Z"), ET)).toBe(
      false
    )
  })
})

describe("formatDue", () => {
  it("formats floating dates without a zone", () => {
    expect(formatDue({ kind: "date", date: "2026-11-13" }, PT)).toBe(
      "Fri, Nov 13"
    )
  })

  it("shows instants in my zone, with the original zone when different", () => {
    const due: Due = {
      kind: "instant",
      at: new Date("2026-11-13T22:00:00Z"),
      timezone: ET,
    }
    expect(formatDue(due, ET)).toBe("Fri, Nov 13, 5:00 PM ET")
    expect(formatDue(due, PT)).toBe("Fri, Nov 13, 2:00 PM PT (5:00 PM ET)")
  })
})

describe("timeZoneLabel", () => {
  it("names the zone for notices", () => {
    expect(timeZoneLabel(PT, new Date("2026-11-13T12:00:00Z"))).toBe(
      "Pacific Time"
    )
  })
})

describe("parseDue", () => {
  it("reads a bare date as a floating date", () => {
    expect(parseDue("2026-11-14", ET)).toEqual({
      kind: "date",
      date: "2026-11-14",
    })
  })

  it("reads an ISO instant with an offset as that moment", () => {
    expect(parseDue("2026-11-14T17:00:00-05:00", PT)).toEqual({
      kind: "instant",
      at: new Date("2026-11-14T22:00:00Z"),
      timezone: PT,
    })
    expect(parseDue("2026-11-14T22:00:00Z", ET)).toMatchObject({
      at: new Date("2026-11-14T22:00:00Z"),
    })
  })

  it("reads a local date-time in the given zone (DST-aware)", () => {
    expect(parseDue("2026-11-14T17:00", PT)).toEqual({
      kind: "instant",
      at: new Date("2026-11-15T01:00:00Z"),
      timezone: PT,
    })
    expect(parseDue("2026-07-01 09:30", ET)).toMatchObject({
      at: new Date("2026-07-01T13:30:00Z"),
    })
  })

  it("rejects junk and unknown zones", () => {
    expect(() => parseDue("next friday", ET)).toThrow(/Can't read/)
    expect(() => parseDue("2026-13-45", ET)).toThrow(RangeError)
    expect(() => parseDue("2026-11-14", "Nope/Nope")).toThrow(RangeError)
  })
})
