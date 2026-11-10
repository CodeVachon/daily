import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
})
afterAll(() => t.close())

describe("schema timezone rules", () => {
  it("stores every timestamp as timestamptz", async () => {
    const naive = await t.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'
      ORDER BY table_name, column_name`)
    expect(naive).toEqual([])
  })

  it("runs sessions in UTC", async () => {
    const [row] = await t.query<{ TimeZone: string }>("SHOW TIME ZONE")
    expect(row?.TimeZone).toBe("UTC")
  })
})
