import { describe, expect, it } from "vitest"

import type { Services } from "@workspace/db"

import { authInfoFromClaims, bearerToken, contextFromAuthInfo } from "./context"

const RESOURCE = "https://daily.test/api/mcp"
const services = {} as Services

describe("authInfoFromClaims", () => {
  it("maps verified claims to AuthInfo", () => {
    const info = authInfoFromClaims(
      { sub: "user-1", azp: "client-1", scope: "openid email", exp: 123 },
      "tok",
      RESOURCE
    )
    expect(info).toEqual({
      token: "tok",
      clientId: "client-1",
      scopes: ["openid", "email"],
      expiresAt: 123,
      resource: new URL(RESOURCE),
      extra: { userId: "user-1" },
    })
  })

  it("falls back to client_id and tolerates missing/odd claims", () => {
    const info = authInfoFromClaims(
      { client_id: "client-2", exp: "soon" },
      "",
      RESOURCE
    )
    expect(info.clientId).toBe("client-2")
    expect(info.scopes).toEqual([])
    expect(info.expiresAt).toBeUndefined()
    expect(info.extra).toEqual({ userId: "" })
  })
})

describe("bearerToken", () => {
  it("strips the auth scheme", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def")
    expect(bearerToken("DPoP xyz")).toBe("xyz")
  })

  it("is empty without a header", () => {
    expect(bearerToken(null)).toBe("")
  })
})

describe("contextFromAuthInfo", () => {
  it("builds the tool context", () => {
    const authInfo = authInfoFromClaims(
      { sub: "user-1", azp: "c", scope: "openid" },
      "t",
      RESOURCE
    )
    expect(contextFromAuthInfo(authInfo, services)).toEqual({
      userId: "user-1",
      clientId: "c",
      scopes: ["openid"],
      services,
    })
  })

  it("refuses requests without a verified user", () => {
    expect(() => contextFromAuthInfo(undefined, services)).toThrow(
      /without verified auth/
    )
    const noUser = authInfoFromClaims({ azp: "c" }, "t", RESOURCE)
    expect(() => contextFromAuthInfo(noUser, services)).toThrow(
      /without verified auth/
    )
  })
})
