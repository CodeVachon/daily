import { describe, expect, it } from "vitest"

import { replaceDefaults, siteHost } from "./integration-view"

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
})
