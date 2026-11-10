import { describe, expect, it } from "vitest"

import { describeBuild } from "./build-info"

describe("describeBuild", () => {
  it("links a release build to its release and commit", () => {
    expect(
      describeBuild({
        version: "1.2.0",
        commit: "47fafd2a1b2c3d4e5f60718293a4b5c6d7e8f901",
      })
    ).toEqual({
      version: "1.2.0",
      releaseUrl: "https://github.com/CodeVachon/daily/releases/tag/v1.2.0",
      commit: "47fafd2",
      commitUrl:
        "https://github.com/CodeVachon/daily/commit/47fafd2a1b2c3d4e5f60718293a4b5c6d7e8f901",
    })
  })

  it("has no links for a local dev build", () => {
    expect(describeBuild({ version: "dev" })).toEqual({
      version: "dev",
      releaseUrl: undefined,
      commit: undefined,
      commitUrl: undefined,
    })
  })
})
