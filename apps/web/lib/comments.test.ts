import { describe, expect, it } from "vitest"

import { toCommentView } from "./comments"

const now = new Date("2026-11-13T15:00:00Z")

describe("toCommentView", () => {
  it("marks the user's own comments as editable", () => {
    const view = toCommentView(
      {
        id: "c1",
        body: "Done **today**",
        author: { type: "user", userId: "u1", clientId: null, label: "Chris" },
        createdAt: new Date("2026-11-13T14:55:00Z"),
        editedAt: null,
      },
      "u1",
      now
    )
    expect(view).toEqual({
      id: "c1",
      body: "Done **today**",
      authorType: "user",
      authorName: "Chris",
      mine: true,
      when: "5 minutes ago",
      edited: false,
    })
  })

  it("doesn't let the user edit an agent's comment", () => {
    const view = toCommentView(
      {
        id: "c2",
        body: "Found it",
        author: {
          type: "agent",
          userId: "u1",
          clientId: "claude",
          label: "Claude Code",
        },
        createdAt: now,
        editedAt: now,
      },
      "u1",
      now
    )
    expect(view).toMatchObject({
      mine: false,
      authorType: "agent",
      edited: true,
    })
  })
})
