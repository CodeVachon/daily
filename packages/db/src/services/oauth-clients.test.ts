import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
  await t.seed.oauthClient({
    id: "row-1",
    clientId: "claude-code",
    name: "Claude Code",
    uri: "https://claude.ai",
    redirectUris: ["http://127.0.0.1:1234/callback"],
  })
})
afterAll(() => t.close())

describe("oauthClients.getDisplayInfo", () => {
  it("returns name and uri for a known client", async () => {
    await expect(
      t.services.oauthClients.getDisplayInfo("claude-code")
    ).resolves.toEqual({
      name: "Claude Code",
      uri: "https://claude.ai",
    })
  })

  it("returns null for an unknown client", async () => {
    await expect(
      t.services.oauthClients.getDisplayInfo("unknown")
    ).resolves.toBeNull()
  })
})

describe("oauthClients.delete", () => {
  it("removes the client", async () => {
    await t.services.oauthClients.delete("claude-code")
    await expect(
      t.services.oauthClients.getDisplayInfo("claude-code")
    ).resolves.toBeNull()
  })
})
