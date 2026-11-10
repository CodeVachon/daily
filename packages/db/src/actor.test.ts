import { describe, expect, it } from "vitest"

import {
  agentActor,
  assertCanDelete,
  ForbiddenError,
  systemActor,
  userActor,
} from "./actor"

describe("actor constructors", () => {
  it("userActor uses the user's name", () => {
    expect(userActor({ id: "u1", name: "Chris" })).toEqual({
      type: "user",
      userId: "u1",
      clientId: null,
      label: "Chris",
    })
  })

  it("agentActor is named after the OAuth client, falling back to its id", () => {
    expect(agentActor("u1", "c1", "Claude Code")).toEqual({
      type: "agent",
      userId: "u1",
      clientId: "c1",
      label: "Claude Code",
    })
    expect(agentActor("u1", "c1", null).label).toBe("c1")
    expect(agentActor("u1", "c1", "   ").label).toBe("c1")
    expect(agentActor("u1", "c1").label).toBe("c1")
  })

  it("systemActor names the background job", () => {
    expect(systemActor("u1", "sync")).toEqual({
      type: "system",
      userId: "u1",
      clientId: null,
      label: "sync",
    })
  })
})

describe("assertCanDelete", () => {
  it("allows the user", () => {
    expect(() =>
      assertCanDelete(userActor({ id: "u1", name: "Chris" }))
    ).not.toThrow()
  })

  it.each([
    ["agent", agentActor("u1", "c1", "Claude Code")],
    ["system", systemActor("u1", "sync")],
  ])("forbids a %s actor", (_, actor) => {
    expect(() => assertCanDelete(actor, "tasks")).toThrow(ForbiddenError)
    expect(() => assertCanDelete(actor, "tasks")).toThrow(
      /cannot delete tasks; only the user can/
    )
  })

  it("carries the actor on the error", () => {
    const actor = agentActor("u1", "c1", "Claude Code")
    try {
      assertCanDelete(actor)
      expect.unreachable()
    } catch (error) {
      expect((error as ForbiddenError).actor).toBe(actor)
    }
  })
})
