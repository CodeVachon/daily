import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  checkCallback,
  connectNotice,
  resultPath,
  startFlow,
} from "./google-oauth"

describe("startFlow", () => {
  it("pairs a random state and verifier with an S256 challenge", () => {
    const a = startFlow("u1")
    const b = startFlow("u1")
    const stored = JSON.parse(a.cookie)
    expect(stored).toMatchObject({ state: a.state, userId: "u1" })
    expect(a.codeChallenge).toBe(
      createHash("sha256").update(stored.verifier).digest("base64url")
    )
    expect(a.state).not.toBe(b.state)
  })
})

describe("checkCallback", () => {
  const { cookie, state } = startFlow("u1")
  const verifier = JSON.parse(cookie).verifier
  const check = (
    query: Record<string, string>,
    over: { cookie?: string; userId?: string | null } = {}
  ) =>
    checkCallback({
      params: new URLSearchParams(query),
      cookie: "cookie" in over ? over.cookie : cookie,
      userId: "userId" in over ? over.userId! : "u1",
    })

  it("accepts Google's answer to this browser's flow", () => {
    expect(check({ code: "c1", state })).toEqual({
      ok: true,
      userId: "u1",
      code: "c1",
      verifier,
    })
  })

  it.each([
    ["no session", { code: "c1", state }, { userId: null }, /Sign in again/],
    ["declined", { error: "access_denied", state }, {}, /wasn't granted/],
    ["other errors", { error: "server_error" }, {}, /server_error/],
    ["no cookie", { code: "c1", state }, { cookie: undefined }, /expired/],
    ["bad cookie", { code: "c1", state }, { cookie: "{" }, /expired/],
    ["wrong shape", { code: "c1", state }, { cookie: "{}" }, /expired/],
    ["wrong state", { code: "c1", state: "x" }, {}, /expired/],
    ["another user", { code: "c1", state }, { userId: "u2" }, /expired/],
    ["no code", { state }, {}, /code/],
  ])("refuses %s", (_, query, over, reason) => {
    const result = check(query, over)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toMatch(reason)
  })
})

describe("result notice", () => {
  it("round-trips through the settings URL", () => {
    const params = (path: string) =>
      Object.fromEntries(new URL(path, "https://d.test").searchParams)
    expect(resultPath({ ok: true })).toBe(
      "/settings/integrations?google=connected"
    )
    expect(connectNotice(params(resultPath({ ok: true })))).toEqual({
      ok: true,
    })
    expect(
      connectNotice(params(resultPath({ ok: false, reason: "No & yes" })))
    ).toEqual({ ok: false, reason: "No & yes" })
  })

  it("ignores other params and caps the reason", () => {
    expect(connectNotice({})).toBeNull()
    expect(connectNotice({ google: ["connected"] })).toBeNull()
    expect(connectNotice({ google: "error" })).toEqual({
      ok: false,
      reason: "Connecting Google failed.",
    })
    expect(
      connectNotice({ google: "error", reason: "x".repeat(500) })
    ).toMatchObject({ reason: "x".repeat(300) })
  })
})
