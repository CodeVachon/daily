import { afterAll, beforeAll, describe, expect, it } from "vitest"

import journal from "../../drizzle/meta/_journal.json" with { type: "json" }
import { createTestDatabase, type TestDatabase } from "../testing"
import { LINK_SYNC_JOB } from "../sync-policy"
import { createHealthService } from "./health"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
})
afterAll(() => t.close())

describe("health", () => {
  it("is ok when every migration is applied", async () => {
    const expected = journal.entries.length
    await expect(t.services.health.check()).resolves.toEqual({
      ok: true,
      database: "up",
      migrations: { applied: expected, expected },
      worker: { lastBeatAt: null, stale: true },
    })
  })

  it("reports the sync worker's heartbeat without affecting ok", async () => {
    await t.services.worker.beat(LINK_SYNC_JOB, { checked: 1 })
    const report = await t.services.health.check()
    expect(report.ok).toBe(true)
    expect(report.worker.stale).toBe(false)
    expect(report.worker.lastBeatAt).toEqual(expect.any(String))
  })

  it("is not ok when a migration is missing", async () => {
    await t.query(
      'delete from drizzle."__drizzle_migrations" where id = (select max(id) from drizzle."__drizzle_migrations")'
    )
    const report = await t.services.health.check()
    expect(report).toMatchObject({ ok: false, database: "up" })
    expect(report.migrations.applied).toBe(report.migrations.expected - 1)
  })

  it("reports the database down when it can't be queried", async () => {
    const other = await createTestDatabase()
    await other.close()
    await expect(createHealthService(other.db).check()).resolves.toMatchObject({
      ok: false,
      database: "down",
    })
  })
})
