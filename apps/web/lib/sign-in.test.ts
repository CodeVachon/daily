import { describe, expect, it } from "vitest"

import { signInErrorMessage } from "./sign-in"

describe("signInErrorMessage", () => {
  it("explains a rejected GitHub account", () => {
    expect(signInErrorMessage("unable_to_get_user_info")).toMatch(
      /isn't authorized/
    )
  })

  it("has a generic message for other errors and nothing without one", () => {
    expect(signInErrorMessage("state_not_found")).toBe(
      "Sign-in failed. Please try again."
    )
    expect(signInErrorMessage(undefined)).toBeNull()
  })
})
