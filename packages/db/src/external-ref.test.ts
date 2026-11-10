import { describe, expect, it } from "vitest"

import { isJiraKey, parseExternalRef } from "./external-ref"

const site = "https://acme.atlassian.net"

describe("parseExternalRef", () => {
  it.each([
    [
      "https://github.com/CodeVachon/daily/issues/12",
      "issue",
      "CodeVachon/daily#12",
      "https://github.com/CodeVachon/daily/issues/12",
    ],
    [
      "  https://github.com/CodeVachon/daily/pull/34/files?w=1  ",
      "pr",
      "CodeVachon/daily#34",
      "https://github.com/CodeVachon/daily/pull/34",
    ],
    [
      "http://www.github.com/a.b/c-d/issues/5#issuecomment-1",
      "issue",
      "a.b/c-d#5",
      "https://github.com/a.b/c-d/issues/5",
    ],
    [
      "CodeVachon/daily#7",
      "issue",
      "CodeVachon/daily#7",
      "https://github.com/CodeVachon/daily/issues/7",
    ],
  ])("GitHub: %s", (input, kind, key, url) => {
    expect(parseExternalRef(input)).toEqual({
      provider: "github",
      kind,
      key,
      url,
    })
  })

  it.each([
    [`${site}/browse/PROJ-42`, "PROJ-42", site],
    [
      "https://other.atlassian.net/jira/software/projects/OPS/boards/1?selectedIssue=OPS-7",
      "OPS-7",
      "https://other.atlassian.net",
    ],
    ["proj-42", "PROJ-42", site],
    ["APP_2-9", "APP_2-9", site],
  ])("Jira: %s", (input, key, origin) => {
    expect(parseExternalRef(input, { jiraSite: site })).toEqual({
      provider: "jira",
      kind: "issue",
      key,
      url: `${origin}/browse/${key}`,
    })
  })

  it.each([
    "",
    "hello",
    "https://github.com/CodeVachon/daily",
    "https://github.com/CodeVachon/daily/issues/abc",
    "https://evil.example.com/browse/PROJ-1",
    "http://acme.atlassian.net/browse/PROJ-1",
    `${site}/browse/`,
    "not a url/browse/PROJ-1",
  ])("rejects %j", (input) => {
    expect(parseExternalRef(input, { jiraSite: site })).toBeNull()
  })

  it("needs a connected site for a bare Jira key", () => {
    expect(parseExternalRef("PROJ-42")).toBeNull()
    expect(isJiraKey(" proj-42 ")).toBe(true)
    expect(isJiraKey("owner/repo#1")).toBe(false)
  })
})
