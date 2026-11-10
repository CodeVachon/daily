import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../actor"
import { NotFoundError } from "../errors"
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

const projects = () => t.services.projects

describe("projects", () => {
  it("creates, lists by name and gets", async () => {
    const home = await projects().create(me, { name: " Home ", color: "green" })
    await projects().create(claude, { name: "Appello" })
    expect(home).toEqual({
      id: home.id,
      name: "Home",
      color: "green",
      archived: false,
    })
    expect((await projects().list(me.userId)).map((p) => p.name)).toEqual([
      "Appello",
      "Home",
    ])
    expect(await projects().get(me.userId, home.id)).toEqual(home)
  })

  it("validates names and colours", async () => {
    await expect(projects().create(me, { name: "" })).rejects.toThrow(
      /Name is required/
    )
    await expect(
      projects().create(me, { name: "x", color: "chartreuse" as never })
    ).rejects.toThrow()
  })

  it("renames, recolours and archives", async () => {
    const p = await projects().create(me, { name: "Side quest" })
    const archived = await projects().update(claude, p.id, {
      name: "Side project",
      archived: true,
    })
    expect(archived).toMatchObject({ name: "Side project", archived: true })
    expect((await projects().list(me.userId)).map((x) => x.id)).not.toContain(
      p.id
    )
    expect(
      (await projects().list(me.userId, { includeArchived: true })).map(
        (x) => x.id
      )
    ).toContain(p.id)
    expect(
      (await projects().update(me, p.id, { archived: false })).archived
    ).toBe(false)
  })

  it("only the user can delete; deleted projects disappear from tasks", async () => {
    const p = await projects().create(me, { name: "Temp" })
    const task = await t.services.tasks.create(me, {
      title: "In temp",
      projectId: p.id,
    })
    await expect(projects().softDelete(claude, p.id)).rejects.toThrow(
      ForbiddenError
    )
    await projects().softDelete(me, p.id)
    await expect(projects().get(me.userId, p.id)).rejects.toThrow(NotFoundError)
    expect((await t.services.tasks.get(me.userId, task.id)).project).toBeNull()
  })
})
