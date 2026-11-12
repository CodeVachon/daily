import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { ValidationError } from "../errors"
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

describe("settings appearance", () => {
  let id: string
  beforeAll(async () => {
    id = (await t.seed.user()).id
  })

  it("defaults to the shipped look", async () => {
    await expect(t.services.settings.getAppearance(id)).resolves.toEqual({
      baseColor: "mist",
      theme: "sky",
      chartColor: "pink",
    })
  })

  it("saves a partial change and keeps the rest", async () => {
    await expect(
      t.services.settings.updateAppearance(id, { theme: "violet" })
    ).resolves.toEqual({
      baseColor: "mist",
      theme: "violet",
      chartColor: "pink",
    })
    await expect(t.services.settings.getAppearance(id)).resolves.toMatchObject({
      theme: "violet",
    })
  })

  it("keeps the timezone when appearance changes", async () => {
    await t.services.settings.reportTimezone(id, "America/Toronto")
    await t.services.settings.updateAppearance(id, { chartColor: "emerald" })
    await expect(t.services.settings.getTimezone(id)).resolves.toBe(
      "America/Toronto"
    )
  })

  it("lets a theme follow the base colour", async () => {
    await t.services.settings.updateAppearance(id, { theme: "mist" })
    await expect(
      t.services.settings.updateAppearance(id, { baseColor: "stone" })
    ).resolves.toEqual({
      baseColor: "stone",
      theme: "stone",
      chartColor: "emerald",
    })
  })

  it("rejects a base colour that isn't the base, and unknown names", async () => {
    await expect(
      t.services.settings.updateAppearance(id, { theme: "zinc" })
    ).rejects.toThrow(/base colour/)
    await expect(
      t.services.settings.updateAppearance(id, {
        chartColor: "plaid" as "pink",
      })
    ).rejects.toThrow(ValidationError)
  })
})

describe("settings week start", () => {
  it("starts weeks on Sunday until I pick another day", async () => {
    await expect(t.services.settings.getWeekStart(userId)).resolves.toBe(0)
    await expect(t.services.settings.updateWeekStart(userId, 1)).resolves.toBe(
      1
    )
    await expect(t.services.settings.getWeekStart(userId)).resolves.toBe(1)
  })

  it("only takes Sunday, Monday or Saturday", async () => {
    await expect(
      t.services.settings.updateWeekStart(userId, 3)
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(t.services.settings.getWeekStart(userId)).resolves.toBe(1)
  })

  it("starts a settings row for a new user", async () => {
    const other = (await t.seed.user()).id
    await t.services.settings.updateWeekStart(other, 6)
    await expect(t.services.settings.getWeekStart(other)).resolves.toBe(6)
    await expect(t.services.settings.getTimezone(other)).resolves.toBe("UTC")
  })
})
