import { describe, expect, it } from "vitest"

import {
  defaultSince,
  formatStandup,
  standupSection,
  upNextUntil,
  type StandupCandidate,
  type StandupItem,
  type StandupSections,
} from "./standup"

const TZ = "America/Toronto"
// Thursday, Nov 12 2026, 10:00 in Toronto.
const now = new Date("2026-11-12T15:00:00Z")
const window = { since: new Date("2026-11-11T05:00:00Z"), now, timezone: TZ }

describe("defaultSince", () => {
  it("is the last standup I posted", () => {
    const last = new Date("2026-11-11T14:00:00Z")
    expect(defaultSince(now, TZ, last)).toEqual(last)
  })

  it("is otherwise the start of the previous working day", () => {
    expect(defaultSince(now, TZ, null)).toEqual(
      new Date("2026-11-11T05:00:00Z")
    )
    // Monday → Friday; Sunday → Friday.
    const monday = new Date("2026-11-16T15:00:00Z")
    expect(defaultSince(monday, TZ, null)).toEqual(
      new Date("2026-11-13T05:00:00Z")
    )
    const sunday = new Date("2026-11-15T15:00:00Z")
    expect(defaultSince(sunday, TZ, null)).toEqual(
      new Date("2026-11-13T05:00:00Z")
    )
  })
})

describe("upNextUntil", () => {
  it("is the end of the next working day", () => {
    expect(upNextUntil(now, TZ)).toEqual(new Date("2026-11-14T05:00:00Z"))
    const friday = new Date("2026-11-13T15:00:00Z")
    expect(upNextUntil(friday, TZ)).toEqual(new Date("2026-11-17T05:00:00Z"))
  })
})

describe("standupSection", () => {
  const task = (over: Partial<StandupCandidate> = {}): StandupCandidate => ({
    statusKey: "todo",
    category: "open",
    completedAt: null,
    due: null,
    openBlockers: 0,
    ...over,
  })

  it("puts tasks finished since the last standup in Done", () => {
    const done = { statusKey: "done", category: "done" as const }
    expect(
      standupSection(
        task({ ...done, completedAt: new Date("2026-11-11T20:00:00Z") }),
        window
      )
    ).toBe("done")
    expect(
      standupSection(
        task({ ...done, completedAt: new Date("2026-11-10T20:00:00Z") }),
        window
      )
    ).toBeNull()
    expect(standupSection(task(done), window)).toBeNull()
    expect(
      standupSection(
        task({ statusKey: "cancelled", category: "cancelled" }),
        window
      )
    ).toBeNull()
  })

  it("sorts open work into In progress, Blocked and Up next", () => {
    const active = { statusKey: "in_progress", category: "active" as const }
    expect(standupSection(task(active), window)).toBe("inProgress")
    expect(standupSection(task({ ...active, openBlockers: 1 }), window)).toBe(
      "blocked"
    )
    expect(
      standupSection(task({ statusKey: "blocked", category: "active" }), window)
    ).toBe("blocked")
    const due = (date: string) => task({ due: { kind: "date", date } })
    expect(standupSection(due("2026-11-13"), window)).toBe("upNext")
    expect(standupSection(due("2026-11-01"), window)).toBe("upNext") // overdue
    expect(standupSection(due("2026-11-14"), window)).toBeNull()
    expect(standupSection(task(), window)).toBeNull()
  })
})

describe("formatStandup", () => {
  const item = (over: Partial<StandupItem> = {}): StandupItem => ({
    number: 12,
    title: "Fix login",
    due: null,
    links: [],
    blockedBy: [],
    ...over,
  })
  const sections = (over: Partial<StandupSections> = {}): StandupSections => ({
    done: [],
    inProgress: [],
    blocked: [],
    upNext: [],
    ...over,
  })
  const full = sections({
    done: [
      item({
        links: [
          {
            key: "acme/web#4",
            url: "https://github.com/acme/web/pull/4",
            state: "merged",
          },
        ],
      }),
    ],
    blocked: [
      item({
        number: 9,
        title: "Deploy <prod> & ship",
        blockedBy: [{ number: 8, title: "Provision DB" }],
      }),
    ],
    upNext: [
      item({
        number: 15,
        title: "Docs",
        due: { kind: "date", date: "2026-11-10" },
      }),
      item({
        number: 16,
        title: "Review",
        due: { kind: "date", date: "2026-11-13" },
      }),
      item({
        number: 17,
        title: "Invoice",
        due: { kind: "date", date: "2026-11-12" },
      }),
    ],
  })

  it("writes Markdown, leaving out empty sections", () => {
    expect(formatStandup(full, "markdown", window)).toBe(
      [
        "**Standup · Thu, Nov 12**",
        "**Done**\n- #12 Fix login · [acme/web#4](https://github.com/acme/web/pull/4) merged",
        "**Blocked**\n- #9 Deploy <prod> & ship · waiting on #8 Provision DB",
        "**Up next**\n- #15 Docs · overdue (Tue, Nov 10)\n- #16 Review · due Fri, Nov 13\n- #17 Invoice · due today",
      ].join("\n\n")
    )
  })

  it("writes Slack mrkdwn, escaping control characters", () => {
    const text = formatStandup(full, "slack", window)
    expect(text).toContain("*Standup · Thu, Nov 12*")
    expect(text).toContain(
      "• #12 Fix login · <https://github.com/acme/web/pull/4|acme/web#4> merged"
    )
    expect(text).toContain("• #9 Deploy &lt;prod&gt; &amp; ship")
  })

  it("says so when there's nothing to report", () => {
    expect(formatStandup(sections(), "markdown", window)).toBe(
      "**Standup · Thu, Nov 12**\n\nNothing to report."
    )
  })
})
