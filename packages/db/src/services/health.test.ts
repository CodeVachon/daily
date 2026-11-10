import { afterAll, beforeAll, describe, expect, it } from "vitest"

import journal from "../../drizzle/meta/_journal.json" with { type: "json" }
import { createTestDatabase, type TestDatabase } from "../testing"
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
    })
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
