import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
})
afterAll(() => t.close())

describe("worker", () => {
  it("runs an exclusive job and returns its result", async () => {
    await expect(
      t.services.worker.exclusive("job", async () => 42)
    ).resolves.toBe(42)
  })

  it("is stale until it beats, and again once the beat is old", async () => {
    const now = new Date("2026-11-10T12:00:00Z")
    expect(await t.services.worker.status("link-sync", now)).toEqual({
      name: "link-sync",
      lastBeatAt: null,
      stale: true,
      details: {},
    })
    await t.services.worker.beat("link-sync", { checked: 3 }, now)
    await t.services.worker.beat("link-sync", { checked: 4 }, now)
    expect(await t.services.worker.status("link-sync", now)).toEqual({
      name: "link-sync",
      lastBeatAt: now,
      stale: false,
      details: { checked: 4 },
    })
    const later = new Date(now.getTime() + 6 * 60_000)
    expect((await t.services.worker.status("link-sync", later)).stale).toBe(
      true
    )
  })
})
