import { describe, expect, it } from "vitest"

import {
  blockPosition,
  calendarHref,
  layoutMonth,
  monthOf,
  openEventId,
  parseView,
  stepLabels,
  viewLinks,
  hourLabels,
  layoutWeek,
  nowPosition,
  parseCalendarDate,
  weekOf,
} from "./calendar"
import { calendarEvent } from "./calendar-fixtures"

const TZ = "America/Toronto"
const now = new Date("2026-11-11T17:00:00Z") // Wed Nov 11, noon in Toronto
const at = (iso: string) => new Date(iso)

describe("parseCalendarDate", () => {
  it("accepts real dates only", () => {
    expect(parseCalendarDate("2026-11-12", TZ)).toBe("2026-11-12")
    expect(parseCalendarDate(["2026-11-12", "x"], TZ)).toBe("2026-11-12")
    expect(parseCalendarDate("2026-02-30", TZ)).toBeNull()
    expect(parseCalendarDate("next week", TZ)).toBeNull()
    expect(parseCalendarDate(undefined, TZ)).toBeNull()
  })
})

describe("weekOf", () => {
  it("is Monday to Sunday in the user's zone, with today marked", () => {
    const week = weekOf("2026-11-12", now, TZ)
    expect(week.days.map((d) => `${d.weekday} ${d.day}`)).toEqual([
      "Mon 9",
      "Tue 10",
      "Wed 11",
      "Thu 12",
      "Fri 13",
      "Sat 14",
      "Sun 15",
    ])
    expect(week.days.filter((d) => d.isToday).map((d) => d.date)).toEqual([
      "2026-11-11",
    ])
    expect(week).toMatchObject({
      title: "Nov 9 – 15, 2026",
      prev: "2026-11-02",
      next: "2026-11-16",
      today: "2026-11-11",
      isCurrent: true,
    })
    expect(week.interval.start).toEqual(at("2026-11-09T05:00:00Z"))
  })

  it("handles the DST change and titles across months and years", () => {
    const dst = weekOf("2026-10-30", now, TZ)
    expect(dst.title).toBe("Oct 26 – Nov 1, 2026")
    expect(dst.isCurrent).toBe(false)
    const sunday = dst.days[6]!
    // Nov 1 is 25 hours long in Toronto.
    expect(
      (sunday.interval.end.getTime() - sunday.interval.start.getTime()) /
        3_600_000
    ).toBe(25)
    expect(weekOf("2026-12-31", now, TZ).title).toBe(
      "Dec 28, 2026 – Jan 3, 2027"
    )
  })
})

describe("layoutWeek", () => {
  const week = weekOf("2026-11-12", now, TZ)
  const thursday = 3

  it("puts all-day and day-long events in the all-day row, by date", () => {
    const holiday = calendarEvent({
      allDay: true,
      startAt: at("2026-11-12T00:00:00Z"),
      endAt: at("2026-11-14T00:00:00Z"),
    })
    const conference = calendarEvent({
      startAt: at("2026-11-09T14:00:00Z"),
      endAt: at("2026-11-10T16:00:00Z"),
    })
    const { allDay, timed } = layoutWeek([holiday, conference], week)
    expect(allDay.map((d) => d.length)).toEqual([1, 1, 0, 1, 1, 0, 0])
    expect(timed.flat()).toEqual([])
  })

  it("hides declined meetings and places the rest by local minutes", () => {
    const standup = calendarEvent({
      startAt: at("2026-11-12T15:00:00Z"), // 10:00 Toronto
      endAt: at("2026-11-12T15:15:00Z"),
    })
    const declined = calendarEvent({ myResponse: "declined" })
    const { timed, hours } = layoutWeek([standup, declined], week)
    expect(timed[thursday]).toEqual([
      { event: standup, start: 600, end: 620, column: 0, columns: 1 },
    ])
    expect(hours).toEqual({ start: 8, end: 18 })
  })

  it("puts overlapping events side by side", () => {
    const a = calendarEvent({
      startAt: at("2026-11-12T15:00:00Z"),
      endAt: at("2026-11-12T16:00:00Z"),
    })
    const b = calendarEvent({
      startAt: at("2026-11-12T15:30:00Z"),
      endAt: at("2026-11-12T16:30:00Z"),
    })
    const c = calendarEvent({
      startAt: at("2026-11-12T16:00:00Z"),
      endAt: at("2026-11-12T16:30:00Z"),
    })
    const d = calendarEvent({
      startAt: at("2026-11-12T18:00:00Z"),
      endAt: at("2026-11-12T18:30:00Z"),
    })
    const blocks = layoutWeek([a, b, c, d], week).timed[thursday]!
    expect(blocks.map((x) => [x.event.id, x.column, x.columns])).toEqual([
      [a.id, 0, 2],
      [b.id, 1, 2],
      [c.id, 0, 2],
      [d.id, 0, 1],
    ])
  })

  it("splits an overnight event at midnight and widens the hours", () => {
    const late = calendarEvent({
      startAt: at("2026-11-13T03:00:00Z"), // Thu 22:00
      endAt: at("2026-11-13T07:00:00Z"), // Fri 02:00
    })
    const { timed, hours } = layoutWeek([late], week)
    expect(timed[thursday]![0]).toMatchObject({ start: 1320, end: 1440 })
    expect(timed[thursday + 1]![0]).toMatchObject({ start: 0, end: 120 })
    expect(hours).toEqual({ start: 0, end: 24 })
  })
})

describe("positions", () => {
  const hours = { start: 8, end: 18 }
  it("places blocks as percentages of the visible hours", () => {
    expect(
      blockPosition(
        {
          event: calendarEvent(),
          start: 600,
          end: 630,
          column: 1,
          columns: 3,
        },
        hours
      )
    ).toEqual({ top: "20%", height: "5%", left: "33.33%", width: "33.33%" })
    expect(
      blockPosition(
        { event: calendarEvent(), start: 420, end: 500, column: 0, columns: 1 },
        hours
      )
    ).toMatchObject({ top: "0%", height: "3.33%" })
  })

  it("labels the hours", () => {
    expect(hourLabels({ start: 11, end: 14 })).toEqual([
      "11 AM",
      "12 PM",
      "1 PM",
    ])
    expect(hourLabels({ start: 0, end: 1 })).toEqual(["12 AM"])
  })

  it("marks now on today's column", () => {
    const week = weekOf("2026-11-12", now, TZ)
    expect(nowPosition(week, hours, now)).toEqual({ dayIndex: 2, top: "40%" })
    expect(nowPosition(week, hours, at("2026-11-11T11:00:00Z"))).toBeNull() // 6 AM, above the grid
    expect(nowPosition(week, hours, at("2026-12-01T17:00:00Z"))).toBeNull()
  })
})

describe("calendar links", () => {
  it("keeps the week and the open meeting in the URL", () => {
    expect(calendarHref("2026-11-12")).toBe("/calendar?date=2026-11-12")
    expect(calendarHref("2026-11-12", { event: "e 1" })).toBe(
      "/calendar?date=2026-11-12&event=e+1"
    )
    expect(calendarHref("2026-11-12", { view: "month", event: "x" })).toBe(
      "/calendar?date=2026-11-12&view=month&event=x"
    )
    expect(parseView("month")).toBe("month")
    expect(parseView(["month"])).toBe("month")
    expect(parseView("year")).toBe("week")
    expect(parseView(undefined)).toBe("week")
    expect(viewLinks("month", "2026-11-12")).toEqual([
      {
        view: "week",
        label: "Week",
        href: "/calendar?date=2026-11-12",
        active: false,
        variant: "ghost",
      },
      {
        view: "month",
        label: "Month",
        href: "/calendar?date=2026-11-12&view=month",
        active: true,
        variant: "secondary",
      },
    ])
    expect(stepLabels("month")).toEqual({
      prev: "Previous month",
      next: "Next month",
    })
    expect(openEventId("abc")).toBe("abc")
    expect(openEventId(["abc", "x"])).toBe("abc")
    expect(openEventId("")).toBeNull()
    expect(openEventId(undefined)).toBeNull()
  })
})

describe("monthOf", () => {
  it("covers the month in whole Monday-start weeks", () => {
    const month = monthOf("2026-11-12", now, TZ)
    expect(month.weeks).toHaveLength(6) // Oct 26 – Dec 6
    expect(month.weeks[0]![0]!.date).toBe("2026-10-26")
    expect(month.weeks[0]![0]!.inMonth).toBe(false)
    expect(month.weeks[0]![6]).toMatchObject({
      date: "2026-11-01",
      inMonth: true,
    })
    expect(month.weeks.at(-1)!.at(-1)!.date).toBe("2026-12-06")
    expect(month).toMatchObject({
      title: "November 2026",
      prev: "2026-10-01",
      next: "2026-12-01",
      today: "2026-11-11",
      isCurrent: true,
    })
    expect(month.interval.start).toEqual(at("2026-10-26T04:00:00Z"))
    expect(month.interval.end).toEqual(at("2026-12-07T05:00:00Z"))
  })

  it("handles months that start on a Monday and year ends", () => {
    const feb = monthOf("2027-02-10", now, TZ)
    expect(feb.weeks).toHaveLength(4) // Feb 2027: Mon 1 – Sun 28
    expect(feb.isCurrent).toBe(false)
    const dec = monthOf("2026-12-31", now, TZ)
    expect(dec).toMatchObject({ prev: "2026-11-01", next: "2027-01-01" })
  })
})

describe("layoutMonth", () => {
  it("lists each day's events, all-day first, with +N more", () => {
    const month = monthOf("2026-11-12", now, TZ)
    const day = (h: number) =>
      calendarEvent({
        startAt: at(`2026-11-12T${h}:00:00Z`),
        endAt: at(`2026-11-12T${h}:30:00Z`),
      })
    const allDay = calendarEvent({
      allDay: true,
      startAt: at("2026-11-12T00:00:00Z"),
      endAt: at("2026-11-13T00:00:00Z"),
    })
    const declined = calendarEvent({ myResponse: "declined" })
    const cells = layoutMonth(
      [day(18), day(15), day(16), allDay, declined],
      month
    )
    const thursday = cells[2]![3]!
    expect(thursday.day.date).toBe("2026-11-12")
    expect(thursday.events.map((e) => e.startAt.toISOString())).toEqual([
      "2026-11-12T00:00:00.000Z",
      "2026-11-12T15:00:00.000Z",
      "2026-11-12T16:00:00.000Z",
    ])
    expect(thursday.more).toBe(1)
    expect(cells[2]![2]!).toMatchObject({ events: [], more: 0 })
  })
})
