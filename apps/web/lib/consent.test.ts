import { describe, expect, it } from "vitest"

import { clientDisplayName, consentOutcome, describeScopes } from "./consent"

describe("describeScopes", () => {
  it("labels known scopes and passes unknown ones through", () => {
    expect(describeScopes("openid  email custom")).toEqual([
      "Confirm your identity",
      "Read your email address",
      "custom",
    ])
  })

  it("is empty without scopes", () => {
    expect(describeScopes(undefined)).toEqual([])
  })
})

describe("clientDisplayName", () => {
  it("prefers the registered name, then the id", () => {
    expect(clientDisplayName({ name: "Claude Code" }, "abc")).toBe(
      "Claude Code"
    )
    expect(clientDisplayName({ name: null }, "abc")).toBe("abc")
    expect(clientDisplayName(null, undefined)).toBe("An unknown client")
  })
})

describe("consentOutcome", () => {
  it("redirects when the provider returns a url", () => {
    expect(consentOutcome({ data: { url: "https://cb.test?code=1" } })).toEqual(
      {
        redirectTo: "https://cb.test?code=1",
      }
    )
  })

  it("surfaces the provider error, or a generic one", () => {
    expect(consentOutcome({ error: { message: "invalid_signature" } })).toEqual(
      {
        error: "invalid_signature",
      }
    )
    expect(consentOutcome({ data: null })).toEqual({
      error: "Something went wrong. Try again from the agent.",
    })
  })
})
