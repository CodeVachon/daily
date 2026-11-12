import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, userActor, type Actor } from "../actor"
import { NotFoundError, ValidationError } from "../errors"
import { DEFAULT_STANDUP_TEMPLATE } from "../standup-template"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let me: Actor
beforeAll(async () => {
  t = await createTestDatabase()
  me = userActor(await t.seed.user())
})
afterAll(() => t.close())

describe("message templates", () => {
  it("gives the default until I change it", async () => {
    const [standup] = await t.services.templates.list(me.userId)
    expect(standup).toMatchObject({
      key: "standup",
      name: "Standup",
      body: DEFAULT_STANDUP_TEMPLATE,
      isDefault: true,
      updatedBy: null,
    })
    expect(standup!.variables.map((v) => v.name)).toContain("mention")
  })

  it("saves an edit, recording who made it", async () => {
    const agent = agentActor(me.userId, "claude-code", "Claude Code")
    const saved = await t.services.templates.update(
      agent,
      "standup",
      "{{mention}} {{date}}"
    )
    expect(saved).toMatchObject({
      body: "{{mention}} {{date}}",
      isDefault: false,
      updatedBy: agent,
    })
    const again = await t.services.templates.update(
      me,
      "standup",
      DEFAULT_STANDUP_TEMPLATE
    )
    expect(again).toMatchObject({ isDefault: true, updatedBy: me })
  })

  it("rejects bad templates and unknown keys", async () => {
    for (const body of ["  ", "{{nope}}", "x".repeat(10_001)])
      await expect(
        t.services.templates.update(me, "standup", body)
      ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      t.services.templates.get(me.userId, "weekly")
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
