import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { agentActor, ForbiddenError, userActor, type Actor } from "../actor"
import { NotFoundError, ValidationError } from "../errors"
import { describeEvent } from "../events"
import { createTestDatabase, type TestDatabase } from "../testing"
import type { RemoteState } from "./links"

let t: TestDatabase
let me: Actor
let agent: Actor
let taskNumber: number
beforeAll(async () => {
  t = await createTestDatabase()
  const user = await t.seed.user()
  me = userActor(user)
  agent = agentActor(user.id, "claude-code", "Claude Code")
  taskNumber = (await t.seed.task(user.id)).number
})
afterAll(() => t.close())

const history = async () =>
  (
    await t.services.activity.forTask(
      me.userId,
      (await t.services.tasks.get(me.userId, taskNumber)).id
    )
  ).map((e) => `${e.actor.label}: ${describeEvent(e.payload)}`)

const open: RemoteState = {
  kind: "pr",
  title: "Add links",
  state: "open",
  stateCategory: "open",
  assignee: "codevachon",
  remoteUpdatedAt: new Date("2026-11-10T12:00:00Z"),
}

describe("links", () => {
  it("adds a link from a URL, recording who linked it", async () => {
    const link = await t.services.links.add(
      agent,
      taskNumber,
      "https://github.com/CodeVachon/daily/pull/3"
    )
    expect(link).toMatchObject({
      provider: "github",
      kind: "pr",
      key: "CodeVachon/daily#3",
      url: "https://github.com/CodeVachon/daily/pull/3",
      title: null,
      lastSyncedAt: null,
      createdBy: agent,
    })
    expect(await history()).toContain(
      "Claude Code: linked https://github.com/CodeVachon/daily/pull/3"
    )
  })

  it("returns the existing link instead of a duplicate", async () => {
    const before = await t.services.links.list(me.userId, taskNumber)
    const again = await t.services.links.add(
      me,
      taskNumber,
      "https://github.com/CodeVachon/daily/pull/3/files"
    )
    expect(again.id).toBe(before[0]!.id)
    expect(await t.services.links.list(me.userId, taskNumber)).toHaveLength(1)
  })

  it("explains unrecognised input", async () => {
    await expect(
      t.services.links.add(me, taskNumber, "https://example.com")
    ).rejects.toThrow(ValidationError)
    await expect(
      t.services.links.add(me, taskNumber, "PROJ-42")
    ).rejects.toThrow(/Connect Jira/)
  })

  it("resolves a Jira key against the connected site", async () => {
    await t.services.integrations.connect(me.userId, {
      provider: "jira",
      account: "chris@example.com",
      config: { site: "https://acme.atlassian.net" },
      credentials: {},
    })
    const link = await t.services.links.add(me, `#${taskNumber}`, "proj-42")
    expect(link.url).toBe("https://acme.atlassian.net/browse/PROJ-42")
  })

  it("fills remote state quietly on the first sync, then records changes", async () => {
    const [link] = await t.services.links.list(me.userId, taskNumber)
    expect(
      await t.services.links.recordSync(me.userId, link!.id, {
        ok: true,
        state: open,
      })
    ).toEqual([])

    const changes = await t.services.links.recordSync(me.userId, link!.id, {
      ok: true,
      state: { ...open, state: "merged", stateCategory: "merged" },
    })
    expect(changes.map((c) => c.field)).toEqual(["state", "stateCategory"])
    const [synced] = await t.services.links.list(me.userId, taskNumber)
    expect(synced).toMatchObject({
      title: "Add links",
      stateCategory: "merged",
      assignee: "codevachon",
      syncError: null,
    })
    expect(synced!.lastSyncedAt).toBeInstanceOf(Date)
    expect((await history())[0]).toBe(
      'sync: synced a link: changed state from "open" to "merged"; changed state category from "open" to "merged"'
    )
  })

  it("keeps the last state when a sync fails", async () => {
    const [link] = await t.services.links.list(me.userId, taskNumber)
    await t.services.links.recordSync(me.userId, link!.id, {
      ok: false,
      error: "GitHub rejected the credentials (401)",
    })
    const [after] = await t.services.links.list(me.userId, taskNumber)
    expect(after).toMatchObject({
      stateCategory: "merged",
      syncError: "GitHub rejected the credentials (401)",
    })
  })

  it("lets only the user remove a link", async () => {
    const [link] = await t.services.links.list(me.userId, taskNumber)
    await expect(t.services.links.remove(agent, link!.id)).rejects.toThrow(
      ForbiddenError
    )
    await t.services.links.remove(me, link!.id)
    expect(await t.services.links.list(me.userId, taskNumber)).toHaveLength(1)
    await expect(t.services.links.remove(me, link!.id)).rejects.toThrow(
      NotFoundError
    )
    expect((await history())[0]).toMatch(/unlinked https:\/\/github.com/)
  })

  it("keeps users' links apart", async () => {
    const other = await t.seed.user()
    const [link] = await t.services.links.list(me.userId, taskNumber)
    await expect(
      t.services.links.recordSync(other.id, link!.id, { ok: false, error: "x" })
    ).rejects.toThrow(NotFoundError)
  })
})
