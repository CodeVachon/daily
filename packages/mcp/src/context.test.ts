import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Services } from "@workspace/db/core"
import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"

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
  let t: TestDatabase
  beforeAll(async () => {
    t = await createTestDatabase()
    await t.seed.user({ id: "user-1", name: "Chris" })
    await t.seed.oauthClient({
      id: "row",
      clientId: "c",
      name: "Claude Code",
      redirectUris: ["http://127.0.0.1:1/cb"],
    })
    await t.services.settings.reportTimezone("user-1", "America/Vancouver")
  })
  afterAll(() => t.close())

  it("builds the tool context with the agent actor and the user's zone", async () => {
    const authInfo = authInfoFromClaims(
      { sub: "user-1", azp: "c", scope: "openid" },
      "t",
      RESOURCE
    )
    await expect(contextFromAuthInfo(authInfo, t.services)).resolves.toEqual({
      userId: "user-1",
      clientId: "c",
      scopes: ["openid"],
      actor: {
        type: "agent",
        userId: "user-1",
        clientId: "c",
        label: "Claude Code",
      },
      timezone: "America/Vancouver",
      services: t.services,
    })
  })

  it("refuses requests without a verified user", async () => {
    await expect(contextFromAuthInfo(undefined, services)).rejects.toThrow(
      /without verified auth/
    )
    const noUser = authInfoFromClaims({ azp: "c" }, "t", RESOURCE)
    await expect(contextFromAuthInfo(noUser, services)).rejects.toThrow(
      /without verified auth/
    )
  })
})
