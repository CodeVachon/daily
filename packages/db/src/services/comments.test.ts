import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../actor"
import { NotFoundError } from "../errors"
import { createTestDatabase, type TestDatabase } from "../testing"

let t: TestDatabase
let me: Actor
let claude: Actor
let codex: Actor
let taskId: string
let taskNumber: number

beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user({ name: "Chris" })
  me = userActor(user)
  claude = agentActor(user.id, "claude", "Claude Code")
  codex = agentActor(user.id, "codex", "Codex")
  const task = await t.services.tasks.create(me, { title: "Discuss" })
  taskId = task.id
  taskNumber = task.number
})
afterAll(() => t.close())

const comments = () => t.services.comments
const lastEvent = async () =>
  (await t.services.activity.forTask(me.userId, taskId))[0]

describe("comments", () => {
  it("adds Markdown comments by any actor and lists them oldest first", async () => {
    const first = await comments().add(
      claude,
      taskId,
      "  Found the **root cause**.  "
    )
    await comments().add(me, `#${taskNumber}`, "Thanks!")
    expect(first).toMatchObject({
      body: "Found the **root cause**.",
      author: claude,
      editedAt: null,
    })
    expect(
      (await comments().list(me.userId, taskId)).map((c) => [
        c.author.label,
        c.body,
      ])
    ).toEqual([
      ["Claude Code", "Found the **root cause**."],
      ["Chris", "Thanks!"],
    ])
    expect((await lastEvent())?.payload.type).toBe("comment_added")
  })

  it("rejects empty comments and unknown tasks", async () => {
    await expect(comments().add(me, taskId, "   ")).rejects.toThrow(
      /Comment is empty/
    )
    await expect(comments().add(me, "missing", "hi")).rejects.toThrow(
      NotFoundError
    )
  })

  it("lets only the author edit, keeping revisions", async () => {
    const c = await comments().add(claude, taskId, "v1")
    await expect(comments().edit(codex, c.id, "hijack")).rejects.toThrow(
      ForbiddenError
    )
    await expect(comments().edit(me, c.id, "mine now")).rejects.toThrow(
      ForbiddenError
    )

    const edited = await comments().edit(claude, c.id, "v2")
    await comments().edit(claude, c.id, "v3")
    expect(edited.editedAt).toBeInstanceOf(Date)
    expect(
      (await comments().revisions(me.userId, c.id)).map((r) => [
        r.body,
        r.replacedBy.label,
      ])
    ).toEqual([
      ["v1", "Claude Code"],
      ["v2", "Claude Code"],
    ])
    expect(await lastEvent()).toMatchObject({
      actor: claude,
      payload: { type: "comment_edited", commentId: c.id },
    })
  })

  it("an unchanged edit writes nothing", async () => {
    const c = await comments().add(me, taskId, "same")
    await comments().edit(me, c.id, "same")
    expect(await comments().revisions(me.userId, c.id)).toEqual([])
  })

  it("only the user can delete (soft); deleted comments disappear", async () => {
    const c = await comments().add(claude, taskId, "remove me")
    await expect(comments().softDelete(claude, c.id)).rejects.toThrow(
      ForbiddenError
    )
    await comments().softDelete(me, c.id)
    expect(
      (await comments().list(me.userId, taskId)).map((x) => x.id)
    ).not.toContain(c.id)
    await expect(comments().edit(claude, c.id, "back")).rejects.toThrow(
      NotFoundError
    )
    expect((await lastEvent())?.payload).toEqual({
      type: "comment_deleted",
      commentId: c.id,
    })
  })
})
