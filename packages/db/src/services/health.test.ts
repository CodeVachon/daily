import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import journal from "../../drizzle/meta/_journal.json" with { type: "json" }
import { createTestDatabase, type TestDatabase } from "../testing"
import { createHealthService } from "./health"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
})
afterAll(() => t.close())

const MIGRATIONS = 'drizzle."__drizzle_migrations"'
const LAST = `id = (select max(id) from ${MIGRATIONS})`

// The tests share one database and run in order: each restores what it
// changes, until the last two, which leave it missing a migration and then
// without the bookkeeping table.
describe("health", () => {
  const expected = journal.entries.length

  it("is ok when every migration is applied", async () => {
    await expect(t.services.health.check()).resolves.toEqual({
      ok: true,
      database: "up",
      migrations: { applied: expected, expected },
    })
  })

  it("ignores migrations from a newer build", async () => {
    await t.query(
      `insert into ${MIGRATIONS} (hash, created_at) values ('newer', 9999999999999)`
    )
    await expect(t.services.health.check()).resolves.toEqual({
      ok: true,
      database: "up",
      migrations: { applied: expected, expected },
    })
    await t.query(`delete from ${MIGRATIONS} where hash = 'newer'`)
  })

  it("is not ok when the applied migrations are not this build's", async () => {
    // Same row count as the journal, but one row is another build's migration.
    const [last] = await t.query<{ created_at: string }>(
      `select created_at from ${MIGRATIONS} where ${LAST}`
    )
    await t.query(`update ${MIGRATIONS} set created_at = 1 where ${LAST}`)
    await expect(t.services.health.check()).resolves.toEqual({
      ok: false,
      database: "up",
      migrations: { applied: expected - 1, expected },
    })
    await t.query(
      `update ${MIGRATIONS} set created_at = ${last!.created_at} where ${LAST}`
    )
    await expect(t.services.health.check()).resolves.toMatchObject({ ok: true })
  })

  it("is not ok when a migration is missing", async () => {
    await t.query(`delete from ${MIGRATIONS} where ${LAST}`)
    await expect(t.services.health.check()).resolves.toEqual({
      ok: false,
      database: "up",
      migrations: { applied: expected - 1, expected },
    })
  })

  it("reports an unmigrated database as up with nothing applied", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      await t.query(`drop table ${MIGRATIONS}`)
      await expect(t.services.health.check()).resolves.toEqual({
        ok: false,
        database: "up",
        migrations: { applied: 0, expected },
      })
      expect(log).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })

  it("reports the database down, and logs why, when it can't be queried", async () => {
    const other = await createTestDatabase()
    await other.close()
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      await expect(
        createHealthService(other.db).check()
      ).resolves.toMatchObject({ ok: false, database: "down" })
      expect(log).toHaveBeenCalledWith(
        "health check: database query failed",
        expect.anything()
      )
    } finally {
      log.mockRestore()
    }
  })
})
