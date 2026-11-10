import { randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"

import { open, seal } from "./crypto"

const key = randomBytes(32).toString("base64")
const source = () => key

describe("seal / open", () => {
  it("round-trips and never repeats a ciphertext", () => {
    const a = seal(source, "ghp_secret", "user-1:github")
    const b = seal(source, "ghp_secret", "user-1:github")
    expect(a).toMatch(/^v1:/)
    expect(a).not.toContain("ghp_secret")
    expect(a).not.toBe(b)
    expect(open(source, a, "user-1:github")).toBe("ghp_secret")
  })

  it("rejects a different context (swapped rows)", () => {
    const sealed = seal(source, "token", "user-1:github")
    expect(() => open(source, sealed, "user-2:github")).toThrow()
  })

  it("rejects a tampered ciphertext", () => {
    const sealed = seal(source, "token", "ctx")
    const raw = Buffer.from(sealed.slice(3), "base64")
    raw[raw.length - 1]! ^= 1
    expect(() => open(source, `v1:${raw.toString("base64")}`, "ctx")).toThrow()
  })

  it("rejects the wrong key", () => {
    const sealed = seal(source, "token", "ctx")
    const other = randomBytes(32).toString("base64")
    expect(() => open(() => other, sealed, "ctx")).toThrow()
  })

  it("explains a malformed key and an unknown version", () => {
    expect(() => seal(() => "short", "x", "ctx")).toThrow(/32 bytes/)
    expect(() => open(source, "v9:abc", "ctx")).toThrow(/version/)
  })
})
