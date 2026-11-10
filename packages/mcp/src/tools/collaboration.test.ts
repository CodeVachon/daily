import { userActor } from "@workspace/db/core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createMcpHarness, type McpHarness } from "../test-harness"

let h: McpHarness
let task: { id: string; ref: string }

beforeAll(async () => {
  h = await createMcpHarness()
  task = (await call("create_task", { title: "Migrate billing" })).task
})
afterAll(() => h.t.close())

async function call(name: string, args: object = {}) {
  const result = await h.callTool(name, args)
  if (result.isError) throw new Error(result.content[0].text)
  return result.structuredContent
}
const errorOf = async (name: string, args: object) =>
  (await h.callTool(name, args)).content[0].text

describe("comments", () => {
  it("adds, lists and edits the agent's own comments", async () => {
    const { comment } = await call("add_comment", {
      task: task.ref,
      body: "Started on the **schema**",
    })
    expect(comment).toMatchObject({
      author: { type: "agent", name: "Claude Code" },
      editedAt: null,
    })
    const { comment: edited } = await call("edit_comment", {
      comment_id: comment.id,
      body: "Schema done",
    })
    expect(edited.editedAt).not.toBeNull()
    expect(
      (await call("list_comments", { task: task.ref })).comments.map(
        (c: { body: string }) => c.body
      )
    ).toEqual(["Schema done"])
  })

  it("cannot edit the user's comments", async () => {
    const mine = await h.t.services.comments.add(
      userActor({ id: h.userId, name: "Chris" }),
      task.id,
      "Mine"
    )
    expect(
      await errorOf("edit_comment", { comment_id: mine.id, body: "x" })
    ).toMatch(/only edit their own/)
  })
})

describe("checklist", () => {
  it("adds, checks off, renames and reorders items", async () => {
    const { item: a } = await call("add_checklist_item", {
      task: task.ref,
      text: "Write migration",
    })
    const { item: b } = await call("add_checklist_item", {
      task: task.ref,
      text: "Backfill",
    })
    expect(
      (await call("update_checklist_item", { item_id: a.id, done: true })).item
        .done
    ).toBe(true)
    expect(
      (
        await call("update_checklist_item", {
          item_id: b.id,
          text: "Backfill data",
          after: null,
        })
      ).item
    ).toEqual({
      id: b.id,
      text: "Backfill data",
      done: false,
    })
    expect(
      (await call("list_checklist", { task: task.ref })).items.map(
        (i: { text: string }) => i.text
      )
    ).toEqual(["Backfill data", "Write migration"])
    expect((await call("get_task", { task: task.ref })).task.checklist).toEqual(
      { done: 1, total: 2 }
    )
  })

  it("requires something to change", async () => {
    const { item } = await call("add_checklist_item", {
      task: task.ref,
      text: "Noop",
    })
    expect(
      await errorOf("update_checklist_item", { item_id: item.id })
    ).toMatch(/at least one/)
  })
})

describe("subtasks and dependencies", () => {
  it("attaches and detaches subtasks", async () => {
    const { task: child } = await call("create_task", { title: "Write tests" })
    expect(
      (await call("set_task_parent", { task: child.ref, parent: task.ref }))
        .task.parentTaskId
    ).toBe(task.id)
    expect(
      (await call("set_task_parent", { task: child.ref, parent: null })).task
        .parentTaskId
    ).toBeNull()
    expect(
      await errorOf("set_task_parent", { task: task.ref, parent: task.ref })
    ).toMatch(/subtasks/)
  })

  it("adds and lists dependencies, rejecting cycles", async () => {
    const { task: infra } = await call("create_task", { title: "Provision DB" })
    const { task: withBlocker } = await call("add_dependency", {
      task: task.ref,
      blocked_by: infra.ref,
    })
    expect(withBlocker.openBlockers).toBe(1)
    expect(await call("list_dependencies", { task: task.ref })).toEqual({
      blockedBy: [
        {
          ref: infra.ref,
          id: infra.id,
          title: "Provision DB",
          status: "todo",
          open: true,
        },
      ],
      blocking: [],
    })
    expect(
      await errorOf("add_dependency", { task: infra.ref, blocked_by: task.ref })
    ).toMatch(/cycle/)
  })
})
