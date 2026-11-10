import { describe, expect, it, vi } from "vitest"

import {
  gateGithubUserInfo,
  githubLogin,
  isAllowedGithubLogin,
  parseAllowlist,
} from "./allowlist"

describe("parseAllowlist", () => {
  it("splits on commas/whitespace, trims and lower-cases", () => {
    expect([...parseAllowlist(" Octocat, hubot\nfoo ")]).toEqual([
      "octocat",
      "hubot",
      "foo",
    ])
  })

  it("is empty for blank or missing input", () => {
    expect(parseAllowlist("").size).toBe(0)
    expect(parseAllowlist(undefined).size).toBe(0)
  })
})

describe("isAllowedGithubLogin", () => {
  const allow = parseAllowlist("codevachon")

  it("matches case-insensitively", () => {
    expect(isAllowedGithubLogin(allow, "CodeVachon")).toBe(true)
  })

  it("rejects unknown or missing logins", () => {
    expect(isAllowedGithubLogin(allow, "someone-else")).toBe(false)
    expect(isAllowedGithubLogin(allow, undefined)).toBe(false)
    expect(isAllowedGithubLogin(allow, null)).toBe(false)
    expect(isAllowedGithubLogin(allow, "")).toBe(false)
  })
})

describe("githubLogin", () => {
  it("reads login from the raw profile", () => {
    expect(githubLogin({ data: { login: "octocat" } })).toBe("octocat")
  })

  it("is undefined when absent or not a string", () => {
    expect(githubLogin(null)).toBeUndefined()
    expect(githubLogin({ data: { login: 42 } })).toBeUndefined()
    expect(githubLogin({})).toBeUndefined()
  })
})

describe("gateGithubUserInfo", () => {
  const info = (login: string) => ({
    user: { email: `${login}@x.test` },
    data: { login },
  })

  it("passes allowlisted users through unchanged", async () => {
    const gated = gateGithubUserInfo(
      async () => info("codevachon"),
      parseAllowlist("codevachon")
    )
    await expect(gated("token")).resolves.toEqual(info("codevachon"))
  })

  it("returns null and reports the login for everyone else", async () => {
    const onReject = vi.fn()
    const gated = gateGithubUserInfo(
      async () => info("intruder"),
      parseAllowlist("codevachon"),
      onReject
    )
    await expect(gated("token")).resolves.toBeNull()
    expect(onReject).toHaveBeenCalledWith("intruder")
  })

  it("returns null when the provider could not load the profile", async () => {
    const gated = gateGithubUserInfo(
      async () => null,
      parseAllowlist("codevachon")
    )
    await expect(gated("token")).resolves.toBeNull()
  })
})
