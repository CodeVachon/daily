import { describe, expect, it } from "vitest"

import {
  connectPrompt,
  disconnectNote,
  oauthStartPath,
  replaceDefaults,
  siteHost,
} from "./integration-view"

const jira = {
  account: "chris@example.com",
  config: { site: "https://acme.atlassian.net", name: "Chris" },
}
const github = { account: "codevachon", config: { login: "codevachon" } }

describe("integration view", () => {
  it("shows the Jira site host", () => {
    expect(siteHost(jira)).toBe("acme.atlassian.net")
    expect(siteHost(github)).toBeNull()
    expect(siteHost(null)).toBeNull()
  })

  it("prefills only non-secret fields when replacing", () => {
    expect(replaceDefaults(jira)).toEqual({
      site: "https://acme.atlassian.net",
      email: "chris@example.com",
    })
    expect(replaceDefaults(github)).toEqual({})
    expect(replaceDefaults(null)).toEqual({})
  })

  it("words the card for pasted credentials vs OAuth", () => {
    const google = {
      id: "google",
      name: "Google Calendar",
      auth: "oauth" as const,
      resourceNoun: { many: "calendars" },
    }
    const gh = { ...google, name: "GitHub", auth: "credentials" as const }
    expect(oauthStartPath(google)).toBe("/api/integrations/google/start")
    expect(connectPrompt(google)).toBe(
      "Connect your Google Calendar account, then choose which calendars Daily reads."
    )
    expect(connectPrompt(gh)).toMatch(/your own credentials/)
    expect(disconnectNote(google)).toMatch(/asks Google Calendar to remove/)
    expect(disconnectNote(gh)).toMatch(/Revoke the token with GitHub/)
  })
})
