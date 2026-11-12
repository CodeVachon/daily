import type { TaskLink } from "@workspace/db/core"
import { describe, expect, it } from "vitest"

import { linkBadges, toLinkView } from "./links"

const base: TaskLink = {
  id: "l1",
  provider: "github",
  kind: "pr",
  key: "CodeVachon/daily#3",
  url: "https://github.com/CodeVachon/daily/pull/3",
  title: null,
  state: null,
  stateCategory: null,
  assignee: null,
  remoteUpdatedAt: null,
  lastSyncedAt: null,
  syncError: null,
  createdBy: { type: "user", userId: "u", clientId: null, label: "Chris" },
  createdAt: new Date(),
}

describe("toLinkView", () => {
  it("has no title or state until the first sync", () => {
    expect(toLinkView(base)).toEqual({
      id: "l1",
      url: base.url,
      key: "CodeVachon/daily#3",
      title: null,
      icon: "pr",
      state: null,
      syncError: null,
    })
  })

  it("shows the synced title and state", () => {
    const view = toLinkView({
      ...base,
      title: "Add links",
      state: "merged",
      stateCategory: "merged",
    })
    expect(view.title).toBe("Add links")
    expect(view.state).toEqual({ label: "merged", variant: "default" })
  })

  it("picks icons and tones per provider and state", () => {
    const jira = toLinkView({
      ...base,
      provider: "jira",
      kind: "issue",
      state: "In Review",
      stateCategory: "open",
      syncError: "Jira returned 404",
    })
    expect(jira.icon).toBe("jira")
    expect(jira.state?.variant).toBe("outline")
    expect(jira.syncError).toBe("Jira returned 404")
    expect(toLinkView({ ...base, kind: "issue" }).icon).toBe("issue")
  })

  it("says it isn't synced when the first sync failed", () => {
    const view = toLinkView({
      ...base,
      syncError: "CodeVachon/daily isn't selected in Settings > Integrations",
    })
    expect(view.state).toEqual({ label: "Not synced", variant: "destructive" })
  })
})

describe("linkBadges", () => {
  it("shows state once synced, else the key", () => {
    expect(
      linkBadges([
        {
          provider: "github",
          kind: "pr",
          key: "o/r#3",
          url: "https://github.com/o/r/pull/3",
          state: "merged",
          stateCategory: "merged",
        },
        {
          provider: "jira",
          kind: "issue",
          key: "FIN-42",
          url: "https://acme.atlassian.net/browse/FIN-42",
          state: null,
          stateCategory: null,
        },
      ])
    ).toEqual([
      { key: "o/r#3", icon: "pr", label: "merged", variant: "default" },
      { key: "FIN-42", icon: "jira", label: "FIN-42", variant: "outline" },
    ])
  })
})
