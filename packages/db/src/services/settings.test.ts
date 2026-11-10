import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let userId: string
beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
})
afterAll(() => t.close())

describe("settings timezone", () => {
  it("defaults to UTC before the browser reports one", async () => {
    await expect(t.services.settings.getTimezone(userId)).resolves.toBe("UTC")
  })

  it("records the first report as a change", async () => {
    await expect(
      t.services.settings.reportTimezone(userId, "America/Toronto")
    ).resolves.toEqual({
      timezone: "America/Toronto",
      previous: null,
      changed: true,
    })
    await expect(t.services.settings.getTimezone(userId)).resolves.toBe(
      "America/Toronto"
    )
  })

  it("is a no-op when the zone is unchanged", async () => {
    await expect(
      t.services.settings.reportTimezone(userId, "America/Toronto")
    ).resolves.toEqual({
      timezone: "America/Toronto",
      previous: "America/Toronto",
      changed: false,
    })
  })

  it("detects travel to another zone", async () => {
    await expect(
      t.services.settings.reportTimezone(userId, "America/Vancouver")
    ).resolves.toEqual({
      timezone: "America/Vancouver",
      previous: "America/Toronto",
      changed: true,
    })
  })

  it("rejects unknown zones", async () => {
    await expect(
      t.services.settings.reportTimezone(userId, "Mars/Olympus")
    ).rejects.toThrow(RangeError)
  })
})
