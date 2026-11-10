import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../actor"
import { NotFoundError, ValidationError } from "../errors"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let me: Actor
let claude: Actor

beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user({ name: "Chris" })
  me = userActor(user)
  claude = agentActor(user.id, "claude", "Claude Code")
})
afterAll(() => t.close())

const deps = () => t.services.dependencies
const make = (title: string, status = "todo") =>
  t.services.tasks.create(me, { title, status })

describe("dependencies", () => {
  it("records blocked-by relationships both ways", async () => {
    const deploy = await make("Deploy")
    const tests = await make("Fix tests")
    const review = await make("Review", "done")
    await deps().add(claude, deploy.id, tests.id)
    await deps().add(claude, `#${deploy.number}`, review.number)

    const { blockedBy, blocking } = await deps().list(me.userId, deploy.id)
    expect(blockedBy.map((d) => [d.title, d.open])).toEqual([
      ["Fix tests", true],
      ["Review", false],
    ])
    expect(blocking).toEqual([])
    expect(
      (await deps().list(me.userId, tests.id)).blocking.map((d) => d.title)
    ).toEqual(["Deploy"])

    const [latest] = await t.services.activity.forTask(me.userId, deploy.id)
    expect(latest).toMatchObject({
      actor: claude,
      payload: { type: "dependency_added", blockedByTaskId: review.id },
    })
  })

  it("counts only open blockers on the task", async () => {
    const ship = await make("Ship")
    const a = await make("A")
    const b = await make("B", "done")
    const c = await make("C")
    for (const blocker of [a, b, c]) await deps().add(me, ship.id, blocker.id)
    await t.services.tasks.softDelete(me, c.id)
    expect((await t.services.tasks.get(me.userId, ship.id)).openBlockers).toBe(
      1
    )
    await t.services.tasks.update(me, a.id, { status: "done" })
    expect((await t.services.tasks.get(me.userId, ship.id)).openBlockers).toBe(
      0
    )
  })

  it("ignores duplicates and rejects self and cycles", async () => {
    const x = await make("X")
    const y = await make("Y")
    const z = await make("Z")
    await deps().add(me, x.id, y.id)
    await deps().add(me, x.id, y.id)
    expect(
      (await t.services.activity.forTask(me.userId, x.id)).filter(
        (e) => e.payload.type === "dependency_added"
      )
    ).toHaveLength(1)

    await deps().add(me, y.id, z.id)
    await expect(deps().add(me, x.id, x.id)).rejects.toThrow(
      /can't block itself/
    )
    await expect(deps().add(me, z.id, x.id)).rejects.toThrow(ValidationError)
    await expect(deps().add(me, y.id, x.id)).rejects.toThrow(/cycle/)
  })

  it("only the user can remove a dependency", async () => {
    const p = await make("P")
    const q = await make("Q")
    await deps().add(claude, p.id, q.id)
    await expect(deps().remove(claude, p.id, q.id)).rejects.toThrow(
      ForbiddenError
    )
    await deps().remove(me, p.id, q.id)
    expect((await deps().list(me.userId, p.id)).blockedBy).toEqual([])
    expect(
      (await t.services.activity.forTask(me.userId, p.id))[0]?.payload
    ).toEqual({
      type: "dependency_removed",
      blockedByTaskId: q.id,
    })
    await expect(deps().remove(me, p.id, q.id)).rejects.toThrow(NotFoundError)
  })
})
