import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
  await t.seed.oauthClient({
    id: "row-1",
    clientId: "claude-code-client",
    name: "Claude Code",
    redirectUris: ["http://127.0.0.1:1/cb"],
  })
  await t.seed.oauthClient({
    id: "row-2",
    clientId: "nameless-client",
    redirectUris: ["http://127.0.0.1:1/cb"],
  })
})
afterAll(() => t.close())

describe("actors.forAgent", () => {
  it("names the agent after its OAuth client", async () => {
    await expect(
      t.services.actors.forAgent("u1", "claude-code-client")
    ).resolves.toEqual({
      type: "agent",
      userId: "u1",
      clientId: "claude-code-client",
      label: "Claude Code",
    })
  })

  it("falls back to the client id for unnamed or unknown clients", async () => {
    expect(
      (await t.services.actors.forAgent("u1", "nameless-client")).label
    ).toBe("nameless-client")
    expect((await t.services.actors.forAgent("u1", "gone")).label).toBe("gone")
  })
})
