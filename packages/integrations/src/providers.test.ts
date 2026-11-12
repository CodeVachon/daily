import { describe, expect, it } from "vitest"

import { fakeFetch } from "./fake-fetch"
import { github } from "./github"
import { ProviderError } from "./http"
import { jira, jiraSite } from "./jira"

const repo = (id: number, name: string) => ({
  id,
  full_name: name,
  html_url: `https://github.com/${name}`,
  description: null,
  private: id % 2 === 0,
})

describe("github", () => {
  const creds = github.credentials.parse({ token: " ghp_x " })

  it("trims and requires the token", () => {
    expect(creds.token).toBe("ghp_x")
    expect(() => github.credentials.parse({ token: " " })).toThrow(
      /GitHub token/
    )
  })

  it("verifies as the token's user", async () => {
    const { fetch, calls } = fakeFetch({
      "https://api.github.com/user": { body: { login: "codevachon" } },
    })
    expect(await github.verify(creds, fetch)).toEqual({
      account: "codevachon",
      config: { login: "codevachon" },
    })
    expect(calls[0]!.headers.authorization).toBe("Bearer ghp_x")
  })

  it("lists every page of repositories", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => repo(i, `o/r${i}`))
    const { fetch, calls } = fakeFetch({
      "https://api.github.com/user/repos?per_page=100&page=1": { body: page1 },
      "https://api.github.com/user/repos?per_page=100&page=2": {
        body: [repo(500, "o/last")],
      },
    })
    const repos = await github.listResources(creds, fetch)
    expect(repos).toHaveLength(101)
    expect(repos.at(-1)).toEqual({
      externalId: "500",
      key: "o/last",
      name: "o/last",
      url: "https://github.com/o/last",
      description: null,
      private: true,
    })
    expect(calls).toHaveLength(2)
  })

  it("explains rejected credentials and outages", async () => {
    const rejected = fakeFetch({
      "https://api.github.com/user": { status: 401, body: {} },
    })
    await expect(github.verify(creds, rejected.fetch)).rejects.toThrow(
      /GitHub rejected the credentials \(401\)/
    )
    const down = fakeFetch({ "https://api.github.com": new TypeError("boom") })
    await expect(github.verify(creds, down.fetch)).rejects.toThrow(
      ProviderError
    )
    const broken = fakeFetch({
      "https://api.github.com/user": {
        status: 500,
        body: { message: "Server Error" },
      },
    })
    await expect(github.verify(creds, broken.fetch)).rejects.toThrow(
      "GitHub returned 500: Server Error"
    )
  })
})

describe("jiraSite", () => {
  it.each([
    ["acme", "https://acme.atlassian.net"],
    ["Acme.atlassian.net", "https://acme.atlassian.net"],
    ["https://acme.atlassian.net/jira/software", "https://acme.atlassian.net"],
  ])("normalizes %s", (input, site) => {
    expect(jiraSite(input)).toBe(site)
  })

  it.each([
    "",
    "http://acme.atlassian.net",
    "evil.example.com",
    "acme.atlassian.net.evil.com",
    "https://",
  ])("rejects %s", (input) => {
    expect(jiraSite(input)).toBeNull()
  })
})

describe("jira", () => {
  const creds = jira.credentials.parse({
    site: "acme",
    email: "chris@example.com",
    apiToken: "tok",
  })
  const base = "https://acme.atlassian.net/rest/api/3"

  it("validates the form", () => {
    expect(creds.site).toBe("https://acme.atlassian.net")
    expect(() =>
      jira.credentials.parse({ site: "x.com", email: "no", apiToken: "" })
    ).toThrow(/Jira Cloud site[\s\S]*email[\s\S]*API token/)
  })

  it("verifies with basic auth", async () => {
    const { fetch, calls } = fakeFetch({
      [`${base}/myself`]: {
        body: { emailAddress: "chris@example.com", displayName: "Chris" },
      },
    })
    expect(await jira.verify(creds, fetch)).toEqual({
      account: "chris@example.com",
      config: { site: "https://acme.atlassian.net", name: "Chris" },
    })
    expect(calls[0]!.headers.authorization).toBe(
      `Basic ${Buffer.from("chris@example.com:tok").toString("base64")}`
    )
  })

  it("falls back to the entered email", async () => {
    const { fetch } = fakeFetch({ [`${base}/myself`]: { body: {} } })
    expect((await jira.verify(creds, fetch)).account).toBe("chris@example.com")
  })

  it("pages through projects", async () => {
    const { fetch } = fakeFetch({
      [`${base}/project/search?orderBy=key&maxResults=50&startAt=0`]: {
        body: {
          isLast: false,
          values: [{ id: "1", key: "APP", name: "Appello" }],
        },
      },
      [`${base}/project/search?orderBy=key&maxResults=50&startAt=50`]: {
        body: {
          isLast: true,
          values: [{ id: "2", key: "OPS", name: "Ops", description: "Infra" }],
        },
      },
    })
    expect(await jira.listResources(creds, fetch)).toEqual([
      {
        externalId: "1",
        key: "APP",
        name: "Appello",
        url: "https://acme.atlassian.net/browse/APP",
        description: null,
        private: false,
      },
      {
        externalId: "2",
        key: "OPS",
        name: "Ops",
        url: "https://acme.atlassian.net/browse/OPS",
        description: "Infra",
        private: false,
      },
    ])
  })

  it("reports Jira's error messages", async () => {
    const { fetch } = fakeFetch({
      [`${base}/myself`]: {
        status: 400,
        body: { errorMessages: ["Bad request", "Try again"] },
      },
    })
    await expect(jira.verify(creds, fetch)).rejects.toThrow(
      "Jira returned 400: Bad request; Try again"
    )
  })

  it("explains a missing site", async () => {
    const { fetch } = fakeFetch({})
    await expect(jira.verify(creds, fetch)).rejects.toThrow(
      /Jira returned 404 \(not found\)\. Check the address/
    )
  })
})
