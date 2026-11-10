import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
})
afterAll(() => t.close())

describe("users.getProfile", () => {
  it("returns the profile with the GitHub account id", async () => {
    const user = await t.seed.user({
      name: "Octo Cat",
      image: "https://img.test/a.png",
    })
    await t.seed.account({
      id: "acc-1",
      accountId: "583231",
      providerId: "github",
      userId: user.id,
    })

    await expect(t.services.users.getProfile(user.id)).resolves.toEqual({
      id: user.id,
      name: "Octo Cat",
      email: user.email,
      image: "https://img.test/a.png",
      createdAt: user.createdAt,
      githubAccountId: "583231",
    })
  })

  it("has a null githubAccountId when there is no GitHub account", async () => {
    const user = await t.seed.user()
    const profile = await t.services.users.getProfile(user.id)
    expect(profile?.githubAccountId).toBeNull()
  })

  it("returns null for an unknown user", async () => {
    await expect(t.services.users.getProfile("nope")).resolves.toBeNull()
  })
})

describe("users.delete", () => {
  it("removes the user and cascades their accounts", async () => {
    const user = await t.seed.user()
    await t.seed.account({
      id: "acc-del",
      accountId: "1",
      providerId: "github",
      userId: user.id,
    })

    await t.services.users.delete(user.id)

    await expect(t.services.users.getProfile(user.id)).resolves.toBeNull()
  })
})
