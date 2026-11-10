import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor } from "../actor"
import { NotFoundError } from "../errors"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let userId: string
let otherId: string
beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
  otherId = (await t.seed.user()).id
})
afterAll(() => t.close())

const repo = (id: number, key: string) => ({
  externalId: String(id),
  key,
  name: key,
  url: `https://github.com/${key}`,
})

describe("integrations", () => {
  it("lists nothing before a connection", async () => {
    expect(await t.services.integrations.list(userId)).toEqual([])
    expect(await t.services.integrations.get(userId, "github")).toBeNull()
    await expect(
      t.services.integrations.credentials(userId, "github")
    ).rejects.toThrow(NotFoundError)
  })

  it("stores credentials encrypted and returns them decrypted", async () => {
    const connection = await t.services.integrations.connect(userId, {
      provider: "github",
      account: "codevachon",
      credentials: { token: "ghp_secret" },
    })
    expect(connection).toMatchObject({
      provider: "github",
      account: "codevachon",
      config: {},
      resources: [],
    })
    expect(connection).not.toHaveProperty("credentialsEnc")
    const [row] = await t.query<{ credentials_enc: string }>(
      "select credentials_enc from integration_connection"
    )
    expect(row!.credentials_enc).toMatch(/^v1:/)
    expect(row!.credentials_enc).not.toContain("ghp_secret")
    expect(
      await t.services.integrations.credentials(userId, "github")
    ).toEqual({ token: "ghp_secret" })
  })

  it("keeps each user's connections apart", async () => {
    expect(await t.services.integrations.list(otherId)).toEqual([])
    await expect(
      t.services.integrations.setResources(otherId, "github", [])
    ).rejects.toThrow(NotFoundError)
  })

  it("replaces the selection, sorted by key and de-duplicated", async () => {
    await t.services.integrations.setResources(userId, "github", [
      repo(2, "codevachon/daily"),
      repo(1, "anzen/app"),
      repo(1, "anzen/app"),
    ])
    const next = await t.services.integrations.setResources(userId, "github", [
      repo(2, "codevachon/daily"),
      repo(3, "codevachon/motte"),
    ])
    expect(next.resources.map((r) => r.key)).toEqual([
      "codevachon/daily",
      "codevachon/motte",
    ])
  })

  it("rejects malformed resources", async () => {
    await expect(
      t.services.integrations.setResources(userId, "github", [
        { ...repo(4, "x/y"), url: "not a url" },
      ])
    ).rejects.toThrow()
  })

  it("only lets the user disconnect, and keeps the selection for later", async () => {
    await expect(
      t.services.integrations.disconnect(
        agentActor(userId, "client", "Claude Code"),
        "github"
      )
    ).rejects.toThrow(ForbiddenError)

    const me = userActor({ id: userId, name: "Chris" })
    await t.services.integrations.disconnect(me, "github")
    expect(await t.services.integrations.list(userId)).toEqual([])
    const [row] = await t.query<{ credentials_enc: string | null }>(
      "select credentials_enc from integration_connection"
    )
    expect(row!.credentials_enc).toBeNull()
    await expect(t.services.integrations.disconnect(me, "github")).rejects.toThrow(
      NotFoundError
    )

    const back = await t.services.integrations.connect(userId, {
      provider: "github",
      account: "codevachon",
      credentials: { token: "ghp_new" },
    })
    expect(back.resources).toHaveLength(2)
  })

  it("replaces credentials and details on reconnect", async () => {
    await t.services.integrations.connect(userId, {
      provider: "jira",
      account: "chris@example.com",
      config: { site: "https://acme.atlassian.net" },
      credentials: { email: "chris@example.com", apiToken: "one" },
    })
    const updated = await t.services.integrations.connect(userId, {
      provider: "jira",
      account: "chris@example.com",
      config: { site: "https://other.atlassian.net" },
      credentials: { email: "chris@example.com", apiToken: "two" },
    })
    expect(updated.config.site).toBe("https://other.atlassian.net")
    expect(await t.services.integrations.credentials(userId, "jira")).toEqual({
      email: "chris@example.com",
      apiToken: "two",
    })
    expect(
      (await t.services.integrations.list(userId)).map((c) => c.provider)
    ).toEqual(["github", "jira"])
  })
})
