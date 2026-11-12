import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { fakeFetch } from "./fake-fetch"
import { createIntegrations, pickResources } from "./integrations"

let t: TestDatabase
let userId: string
beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
})
afterAll(() => t.close())

const repo = (id: number, name: string) => ({
  id,
  full_name: name,
  html_url: `https://github.com/${name}`,
  description: `About ${name}`,
  private: false,
})

const github = fakeFetch({
  "https://api.github.com/user/repos": {
    body: [repo(1, "codevachon/daily"), repo(2, "useAnzen/app")],
  },
  "https://api.github.com/user": { body: { login: "codevachon" } },
})

describe("createIntegrations", () => {
  const integrations = () =>
    createIntegrations({ services: t.services, fetch: github.fetch })

  it("lists providers without their functions", () => {
    const providers = integrations().providers()
    expect(providers.map((p) => p.id)).toEqual(["github", "jira", "google"])
    expect(providers.find((p) => p.id === "google")).toMatchObject({
      auth: "oauth",
      configured: false,
    })
    expect(JSON.parse(JSON.stringify(providers))).toEqual(providers)
  })

  it("rejects unknown providers and bad credentials before calling out", async () => {
    await expect(integrations().connect(userId, "gitlab", {})).rejects.toThrow(
      /Unknown integration/
    )
    await expect(
      integrations().connect(userId, "github", { token: "" })
    ).rejects.toThrow(/GitHub token/)
  })

  it("verifies, then stores the credentials", async () => {
    const connection = await integrations().connect(userId, "github", {
      token: "ghp_x",
    })
    expect(connection).toMatchObject({
      provider: "github",
      account: "codevachon",
    })
    expect(await t.services.integrations.credentials(userId, "github")).toEqual(
      { token: "ghp_x" }
    )
  })

  it("lists what the stored credentials can see", async () => {
    const repos = await integrations().available(userId, "github")
    expect(repos.map((r) => r.key)).toEqual([
      "codevachon/daily",
      "useAnzen/app",
    ])
  })

  it("selects by id or key and stores only the identity", async () => {
    const connection = await integrations().select(userId, "github", [
      "1",
      "USEANZEN/APP",
    ])
    expect(connection.resources).toEqual([
      {
        externalId: "1",
        key: "codevachon/daily",
        name: "codevachon/daily",
        url: "https://github.com/codevachon/daily",
      },
      {
        externalId: "2",
        key: "useAnzen/app",
        name: "useAnzen/app",
        url: "https://github.com/useAnzen/app",
      },
    ])
    expect(
      (await integrations().select(userId, "github", [])).resources
    ).toEqual([])
  })

  it("needs a connection to list or select", async () => {
    await expect(integrations().available(userId, "jira")).rejects.toThrow(
      /not found/
    )
  })
})

describe("pickResources", () => {
  const available = [
    {
      externalId: "1",
      key: "APP",
      name: "Appello",
      url: "https://x/APP",
      description: null,
      private: false,
    },
  ]

  it("names every unknown reference", () => {
    expect(() => pickResources(available, ["APP", "NOPE", "9"])).toThrow(
      "Not visible with these credentials: NOPE, 9"
    )
  })
})
