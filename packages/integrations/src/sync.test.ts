import { userActor } from "@workspace/db/core"
import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { fakeFetch } from "./fake-fetch"
import { github, githubState } from "./github"
import { createIntegrations } from "./integrations"
import { jira, jiraState } from "./jira"

const issue = (over: object = {}) => ({
  title: "Fix login",
  state: "open" as const,
  updated_at: "2026-11-10T12:00:00Z",
  assignee: { login: "codevachon" },
  ...over,
})

describe("githubState", () => {
  it.each([
    [{}, "issue", "open", "open"],
    [{ state: "closed", state_reason: "completed" }, "issue", "closed", "done"],
    [
      { state: "closed", state_reason: "not_planned" },
      "issue",
      "closed",
      "closed",
    ],
    [{ pull_request: { merged_at: null } }, "pr", "open", "open"],
    [
      { pull_request: { merged_at: null }, draft: true },
      "pr",
      "draft",
      "draft",
    ],
    [
      { state: "closed", pull_request: { merged_at: "2026-11-10" } },
      "pr",
      "merged",
      "merged",
    ],
    [
      { state: "closed", pull_request: { merged_at: null } },
      "pr",
      "closed",
      "closed",
    ],
  ])("%j → %s %s (%s)", (over, kind, state, category) => {
    expect(githubState(issue(over))).toMatchObject({
      kind,
      state,
      stateCategory: category,
    })
  })

  it("keeps title, assignee and update time", () => {
    expect(githubState(issue({ assignee: null }))).toEqual({
      kind: "issue",
      title: "Fix login",
      state: "open",
      stateCategory: "open",
      assignee: null,
      remoteUpdatedAt: new Date("2026-11-10T12:00:00Z"),
    })
  })
})

describe("jiraState", () => {
  const fields = (key: string, over: object = {}) => ({
    fields: {
      summary: "Reconcile",
      status: { name: "In Review", statusCategory: { key } },
      ...over,
    },
  })

  it("maps status categories", () => {
    expect(jiraState(fields("new")).stateCategory).toBe("open")
    expect(jiraState(fields("indeterminate"))).toMatchObject({
      state: "In Review",
      stateCategory: "open",
      assignee: null,
      remoteUpdatedAt: null,
    })
    expect(
      jiraState(
        fields("done", {
          assignee: { displayName: "Chris" },
          updated: "2026-11-10T09:00:00.000-0500",
        })
      )
    ).toMatchObject({
      stateCategory: "done",
      assignee: "Chris",
      remoteUpdatedAt: new Date("2026-11-10T14:00:00Z"),
    })
  })
})

describe("provider fetchItem", () => {
  it("asks GitHub's issues API for owner/repo#n", async () => {
    const { fetch, calls } = fakeFetch({
      "https://api.github.com/repos/CodeVachon/daily/issues/3": {
        body: issue({ pull_request: { merged_at: null } }),
      },
    })
    const link = {
      kind: "issue" as const,
      key: "CodeVachon/daily#3",
      url: "https://github.com/CodeVachon/daily/issues/3",
    }
    expect(github.scopeOf(link)).toBe("CodeVachon/daily")
    expect((await github.fetchItem({ token: "t" }, link, fetch)).kind).toBe(
      "pr"
    )
    expect(calls).toHaveLength(1)
  })

  it("asks Jira for the issue on the connected site only", async () => {
    const creds = {
      site: "https://acme.atlassian.net",
      email: "c@example.com",
      apiToken: "t",
    }
    const link = {
      kind: "issue" as const,
      key: "FIN-42",
      url: "https://acme.atlassian.net/browse/FIN-42",
    }
    expect(jira.scopeOf(link)).toBe("FIN")
    const { fetch } = fakeFetch({
      "https://acme.atlassian.net/rest/api/3/issue/FIN-42?": {
        body: {
          fields: {
            summary: "Reconcile",
            status: { name: "Done", statusCategory: { key: "done" } },
          },
        },
      },
    })
    expect((await jira.fetchItem(creds, link, fetch)).state).toBe("Done")
    await expect(
      jira.fetchItem(
        creds,
        { ...link, url: "https://other.atlassian.net/browse/FIN-42" },
        fetch
      )
    ).rejects.toThrow(/other.atlassian.net, not the connected site/)
  })
})

describe("refreshLink", () => {
  let t: TestDatabase
  let userId: string
  let taskNumber: number
  beforeAll(async () => {
    t = await createTestDatabase()
    userId = (await t.seed.user()).id
    taskNumber = (await t.seed.task(userId)).number
  })
  afterAll(() => t.close())

  const routes = {
    "https://api.github.com/repos/CodeVachon/daily/issues/3": {
      body: issue({ title: "Ship it", pull_request: { merged_at: null } }),
    },
    "https://api.github.com/repos/CodeVachon/daily/issues/4": {
      status: 404,
      body: {},
    },
  }
  const integrations = () =>
    createIntegrations({ services: t.services, fetch: fakeFetch(routes).fetch })
  const add = (ref: string) =>
    t.services.links.add(
      userActor({ id: userId, name: "Chris" }),
      taskNumber,
      ref
    )

  it("explains a missing connection", async () => {
    const link = await add("CodeVachon/daily#3")
    expect(
      (await integrations().refreshLink(userId, link.id)).syncError
    ).toMatch(/Connect GitHub/)
  })

  it("won't look outside the selected repositories", async () => {
    await t.services.integrations.connect(userId, {
      provider: "github",
      account: "codevachon",
      credentials: { token: "t" },
    })
    const [link] = await t.services.links.list(userId, taskNumber)
    expect((await integrations().refreshLink(userId, link!.id)).syncError).toBe(
      "CodeVachon/daily isn't selected in Settings > Integrations"
    )
  })

  it("fills in title and state for an in-scope item", async () => {
    await t.services.integrations.setResources(userId, "github", [
      {
        externalId: "1",
        key: "codevachon/DAILY",
        name: "daily",
        url: "https://github.com/CodeVachon/daily",
      },
    ])
    const [link] = await t.services.links.list(userId, taskNumber)
    expect(await integrations().refreshLink(userId, link!.id)).toMatchObject({
      kind: "pr",
      title: "Ship it",
      state: "open",
      stateCategory: "open",
      syncError: null,
    })
  })

  it("records provider errors instead of throwing", async () => {
    const link = await add("CodeVachon/daily#4")
    expect(
      (await integrations().refreshLink(userId, link.id)).syncError
    ).toMatch(/GitHub returned 404/)
  })
})
