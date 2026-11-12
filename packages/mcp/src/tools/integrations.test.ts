import { userActor } from "@workspace/db/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

const repo = (id: number, name: string, isPrivate = false) => ({
  id,
  full_name: name,
  html_url: `https://github.com/${name}`,
  description: null,
  private: isPrivate,
})

const calendars = {
  items: [
    { id: "chris@example.com", summary: "chris@example.com", primary: true },
    { id: "team@group.calendar.google.com", summary: "Team" },
  ],
}

// Stands in for api.github.com and Google's calendar list.
const remote: typeof fetch = async (input) => {
  const url = String(input)
  const body = url.startsWith("https://www.googleapis.com/calendar/v3/")
    ? calendars
    : url.startsWith("https://api.github.com/user/repos")
      ? [repo(1, "codevachon/daily"), repo(2, "useAnzen/app", true)]
      : { login: "codevachon" }
  return new Response(JSON.stringify(body), { status: 200 })
}

let h: McpHarness
beforeAll(async () => {
  h = await createMcpHarness({
    fetch: remote,
    google: {
      clientId: "id",
      clientSecret: "secret",
      redirectUri: "https://daily.test/api/integrations/google/callback",
    },
  })
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}

describe("integration tools", () => {
  it("lists providers before anything is connected", async () => {
    const { integrations } = await call("list_integrations")
    expect(integrations).toEqual([
      expect.objectContaining({
        provider: "github",
        connected: false,
        account: null,
        in_scope: [],
      }),
      expect.objectContaining({
        provider: "jira",
        resource_noun: "projects",
        connected: false,
      }),
      expect.objectContaining({
        provider: "google",
        name: "Google Calendar",
        resource_noun: "calendars",
        connected: false,
      }),
    ])
  })

  it("explains that a provider must be connected first", async () => {
    const result = await h.callTool("list_integration_resources", {
      provider: "github",
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/github connection not found/)
  })

  it("scopes repositories by key once the user has connected", async () => {
    await h.t.services.integrations.connect(h.userId, {
      provider: "github",
      account: "codevachon",
      config: { login: "codevachon" },
      credentials: { token: "ghp_x" },
    })

    const { in_scope } = await call("set_integration_scope", {
      provider: "github",
      keys: ["codevachon/daily"],
    })
    expect(in_scope).toEqual([
      {
        key: "codevachon/daily",
        name: "codevachon/daily",
        url: "https://github.com/codevachon/daily",
      },
    ])

    const { resources } = await call("list_integration_resources", {
      provider: "github",
    })
    expect(
      resources.map((r: { key: string; in_scope: boolean }) => [
        r.key,
        r.in_scope,
      ])
    ).toEqual([
      ["codevachon/daily", true],
      ["useAnzen/app", false],
    ])

    const { integrations } = await call("list_integrations")
    expect(integrations[0]).toMatchObject({
      connected: true,
      account: "codevachon",
      details: { login: "codevachon" },
      in_scope: [{ key: "codevachon/daily" }],
    })
    expect(JSON.stringify(integrations)).not.toContain("ghp_x")
  })

  it("rejects keys the credentials can't see, changing nothing", async () => {
    const result = await h.callTool("set_integration_scope", {
      provider: "github",
      keys: ["someone/else"],
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/someone\/else/)
    const connection = await h.t.services.integrations.get(h.userId, "github")
    expect(connection?.resources).toHaveLength(1)
  })

  it("hides disconnected integrations", async () => {
    await h.t.services.integrations.disconnect(
      userActor({ id: h.userId, name: "Chris" }),
      "github"
    )
    const { integrations } = await call("list_integrations")
    expect(integrations[0].connected).toBe(false)
  })

  it("scopes Google calendars by name", async () => {
    await h.t.services.integrations.connect(h.userId, {
      provider: "google",
      account: "chris@example.com",
      credentials: {
        refreshToken: "r",
        accessToken: "a",
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    })
    const { resources } = await call("list_integration_resources", {
      provider: "google",
    })
    expect(resources.map((r: { key: string }) => r.key)).toEqual([
      "chris@example.com",
      "Team",
    ])
    const { in_scope } = await call("set_integration_scope", {
      provider: "google",
      keys: ["chris@example.com", "team"],
    })
    expect(in_scope.map((r: { name: string }) => r.name).sort()).toEqual([
      "Team",
      "chris@example.com",
    ])
  })
})
