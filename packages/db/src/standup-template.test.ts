import { describe, expect, it } from "vitest"

import type { StandupItem, StandupSections } from "./standup"
import {
  DEFAULT_STANDUP_TEMPLATE,
  isTemplateKey,
  slackMention,
  STANDUP_SCHEMA,
  standupContext,
  TEMPLATES,
} from "./standup-template"
import { renderTemplate, validateTemplate } from "./templates"

const window = {
  since: new Date("2026-11-11T05:00:00Z"),
  now: new Date("2026-11-12T15:00:00Z"),
  timezone: "America/Toronto",
}

const item = (over: Partial<StandupItem> = {}): StandupItem => ({
  number: 12,
  title: "Fix login",
  due: null,
  links: [],
  blockedBy: [],
  ...over,
})

const empty: StandupSections = {
  done: [],
  inProgress: [],
  blocked: [],
  upNext: [],
}

const render = (sections: StandupSections, memberId: string | null = "U1") =>
  renderTemplate(
    DEFAULT_STANDUP_TEMPLATE,
    STANDUP_SCHEMA,
    standupContext(sections, window, memberId)
  )

describe("the default standup template", () => {
  it("is valid, and registered", () => {
    expect(() =>
      validateTemplate(DEFAULT_STANDUP_TEMPLATE, STANDUP_SCHEMA)
    ).not.toThrow()
    expect(TEMPLATES.standup.defaultBody).toBe(DEFAULT_STANDUP_TEMPLATE)
    expect(isTemplateKey("standup")).toBe(true)
    expect(isTemplateKey("other")).toBe(false)
  })

  it("mentions me and lists each section with links and notes", () => {
    expect(
      render({
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
        inProgress: [item({ number: 13, title: "Docs" })],
        blocked: [
          item({
            number: 9,
            title: "Deploy <prod> & ship",
            blockedBy: [{ number: 8, title: "Provision DB" }],
          }),
        ],
        upNext: [
          item({
            number: 17,
            title: "Invoice",
            due: { kind: "date", date: "2026-11-12" },
          }),
        ],
      })
    ).toBe(
      [
        "<@U1> *Standup · Thu, Nov 12*",
        "",
        "*Done*",
        "• #12 Fix login · <https://github.com/acme/web/pull/4|acme/web#4> merged",
        "",
        "*In progress*",
        "• #13 Docs",
        "",
        "*Blocked*",
        "• #9 Deploy &lt;prod&gt; &amp; ship · waiting on #8 Provision DB",
        "",
        "*Up next*",
        "• #17 Invoice · due today",
      ].join("\n")
    )
  })

  it("says so when there's nothing to report", () => {
    expect(render(empty, null)).toBe(
      "*Standup · Thu, Nov 12*\n\nNothing to report."
    )
  })
})

describe("standupContext", () => {
  it("gives the date, the start and section flags", () => {
    expect(standupContext(empty, window, null)).toMatchObject({
      mention: "",
      date: "Thu, Nov 12",
      since: "Wed, Nov 11, 12:00 AM ET",
      nothing_to_report: true,
      has_done: false,
      done: [],
    })
  })

  it("makes a real Slack mention", () => {
    expect(slackMention("U012AB3CD")).toBe("<@U012AB3CD>")
    expect(slackMention(null)).toBe("")
  })
})
