import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let userId: string
const actor = `'{"type":"user","userId":"x","clientId":null,"label":"Chris"}'::jsonb`

beforeAll(async () => {
  t = await createTestDatabase()
  userId = (await t.seed.user()).id
})
afterAll(() => t.close())

let n = 0
/** Insert a task row with raw SQL; `extra` overrides columns. */
function insertTask(extra: Record<string, string> = {}) {
  n += 1
  const cols: Record<string, string> = {
    id: `'task-${n}'`,
    user_id: `'${userId}'`,
    number: String(n),
    title: `'Task ${n}'`,
    status_key: `'todo'`,
    board_position: `'a${n}'`,
    created_by: actor,
    updated_by: actor,
    ...extra,
  }
  return t.query(
    `INSERT INTO task (${Object.keys(cols).join(", ")}) VALUES (${Object.values(cols).join(", ")})`
  )
}

describe("task_status seed", () => {
  it("has the six v1 columns in board order", async () => {
    const rows = await t.query<{ key: string; category: string }>(
      "SELECT key, category FROM task_status ORDER BY position"
    )
    expect(rows).toEqual([
      { key: "backlog", category: "open" },
      { key: "todo", category: "open" },
      { key: "in_progress", category: "active" },
      { key: "blocked", category: "active" },
      { key: "done", category: "done" },
      { key: "cancelled", category: "cancelled" },
    ])
  })
})

describe("task constraints", () => {
  it("accepts a floating due date or a zoned due instant", async () => {
    await expect(
      insertTask({ due_date: `'2026-11-13'` })
    ).resolves.toBeDefined()
    await expect(
      insertTask({
        due_at: `'2026-11-13T22:00:00Z'`,
        due_timezone: `'America/Toronto'`,
      })
    ).resolves.toBeDefined()
  })

  it("rejects both kinds of due at once", async () => {
    await expect(
      insertTask({
        due_date: `'2026-11-13'`,
        due_at: `'2026-11-13T22:00:00Z'`,
        due_timezone: `'UTC'`,
      })
    ).rejects.toThrow(/task_due_one_kind/)
  })

  it("requires a zone with a due instant (and only then)", async () => {
    await expect(
      insertTask({ due_at: `'2026-11-13T22:00:00Z'` })
    ).rejects.toThrow(/task_due_at_has_zone/)
    await expect(insertTask({ due_timezone: `'UTC'` })).rejects.toThrow(
      /task_due_at_has_zone/
    )
  })

  it("rejects an unknown status", async () => {
    await expect(insertTask({ status_key: `'someday'` })).rejects.toThrow(
      /foreign key/
    )
  })

  it("keeps task numbers unique per user", async () => {
    await insertTask({ id: `'dup-a'`, number: "900" })
    await expect(insertTask({ id: `'dup-b'`, number: "900" })).rejects.toThrow(
      /task_user_number_uidx/
    )
  })

  it("defaults priority to none and description to empty", async () => {
    await insertTask({ id: `'defaults'` })
    const [row] = await t.query<{ priority: string; description: string }>(
      "SELECT priority, description FROM task WHERE id = 'defaults'"
    )
    expect(row).toEqual({ priority: "none", description: "" })
  })
})

describe("label names", () => {
  const insertLabel = (id: string, name: string, deleted = false) =>
    t.query(
      `INSERT INTO label (id, user_id, name, deleted_at) VALUES ('${id}', '${userId}', '${name}', ${deleted ? "now()" : "null"})`
    )

  it("are unique case-insensitively among live labels", async () => {
    await insertLabel("l1", "Work")
    await expect(insertLabel("l2", "work")).rejects.toThrow(
      /label_user_name_uidx/
    )
  })

  it("can be reused after the old label is soft-deleted", async () => {
    await insertLabel("l3", "Home", true)
    await expect(insertLabel("l4", "home")).resolves.toBeDefined()
  })
})
