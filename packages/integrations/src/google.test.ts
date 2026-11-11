import { agentActor, userActor } from "@workspace/db/core"
import { createTestDatabase, type TestDatabase } from "@workspace/db/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { fakeFetch } from "./fake-fetch"
import {
  exchangeGoogleCode,
  GOOGLE_SCOPES,
  googleAuthorizeUrl,
  googleConfig,
  isFresh,
  listGoogleCalendars,
  refreshGoogleToken,
  revokeGoogleToken,
} from "./google"
import { createIntegrations } from "./integrations"

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://daily.test/api/integrations/google/callback",
}
const TOKEN = "https://oauth2.googleapis.com/token"
const LIST = "https://www.googleapis.com/calendar/v3/users/me/calendarList"
const now = new Date("2026-11-11T12:00:00Z")

const tokens = (over: object = {}) => ({
  access_token: "access-1",
  expires_in: 3600,
  refresh_token: "refresh-1",
  scope: GOOGLE_SCOPES.join(" "),
  token_type: "Bearer",
  ...over,
})

const primary = {
  id: "chris@example.com",
  summary: "chris@example.com",
  primary: true,
  accessRole: "owner",
}
const team = {
  id: "team@group.calendar.google.com",
  summary: "Team",
  summaryOverride: "Team (mine)",
  description: "Shared",
  accessRole: "reader",
}

describe("googleAuthorizeUrl", () => {
  it("asks for offline access to both scopes with PKCE", () => {
    const url = new URL(
      googleAuthorizeUrl(config, { state: "s1", codeChallenge: "c1" })
    )
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    )
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "client-id",
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: "s1",
      code_challenge: "c1",
      code_challenge_method: "S256",
    })
  })
})

describe("exchangeGoogleCode", () => {
  it("trades the code (with the verifier) for tokens", async () => {
    const { fetch, calls } = fakeFetch({ [TOKEN]: { body: tokens() } })
    expect(
      await exchangeGoogleCode(config, fetch, {
        code: "code-1",
        codeVerifier: "verifier-1",
        now,
      })
    ).toEqual({
      refreshToken: "refresh-1",
      accessToken: "access-1",
      expiresAt: "2026-11-11T13:00:00.000Z",
    })
    expect(calls[0]!.method).toBe("POST")
    expect(Object.fromEntries(new URLSearchParams(calls[0]!.body!))).toEqual({
      grant_type: "authorization_code",
      code: "code-1",
      code_verifier: "verifier-1",
      client_id: "client-id",
      client_secret: "client-secret",
      redirect_uri: config.redirectUri,
    })
  })

  it.each([
    [{ scope: GOOGLE_SCOPES[1] }, /both calendar permissions/],
    [{ refresh_token: undefined }, /offline access/],
  ])("refuses a partial grant %j", async (over, message) => {
    const { fetch } = fakeFetch({ [TOKEN]: { body: tokens(over) } })
    await expect(
      exchangeGoogleCode(config, fetch, { code: "c", codeVerifier: "v" })
    ).rejects.toThrow(message)
  })

  it("explains Google's errors", async () => {
    const reject = (body: object) =>
      exchangeGoogleCode(
        config,
        fakeFetch({ [TOKEN]: { status: 400, body } }).fetch,
        { code: "c", codeVerifier: "v" }
      )
    await expect(reject({ error: "invalid_grant" })).rejects.toThrow(
      /sign-in code/
    )
    await expect(
      reject({ error: "invalid_client", error_description: "Unauthorized" })
    ).rejects.toThrow("Google returned 400: Unauthorized")
    await expect(reject({ error: "invalid_request" })).rejects.toThrow(
      "Google returned 400: invalid_request"
    )
    await expect(reject({})).rejects.toThrow("Google returned 400")
    await expect(
      exchangeGoogleCode(
        config,
        fakeFetch({ [TOKEN]: new Error("offline") }).fetch,
        { code: "c", codeVerifier: "v" }
      )
    ).rejects.toThrow(/Couldn't reach Google/)
  })
})

describe("tokens", () => {
  const creds = {
    refreshToken: "refresh-1",
    accessToken: "access-1",
    expiresAt: "2026-11-11T12:05:00.000Z",
  }

  it("counts a token as fresh until a minute before it expires", () => {
    expect(isFresh(creds, now)).toBe(true)
    expect(isFresh(creds, new Date("2026-11-11T12:04:30Z"))).toBe(false)
  })

  it("refreshes, keeping the refresh token unless Google sends a new one", async () => {
    const { fetch, calls } = fakeFetch({
      [TOKEN]: {
        body: tokens({ access_token: "access-2", refresh_token: undefined }),
      },
    })
    expect(await refreshGoogleToken(config, fetch, creds, now)).toEqual({
      refreshToken: "refresh-1",
      accessToken: "access-2",
      expiresAt: "2026-11-11T13:00:00.000Z",
    })
    expect(new URLSearchParams(calls[0]!.body!).get("grant_type")).toBe(
      "refresh_token"
    )
  })

  it("asks for a reconnect when the refresh token stops working", async () => {
    const { fetch } = fakeFetch({
      [TOKEN]: { status: 400, body: { error: "invalid_grant" } },
    })
    await expect(refreshGoogleToken(config, fetch, creds, now)).rejects.toThrow(
      /Reconnect Google in Settings/
    )
  })

  it("revokes without ever throwing", async () => {
    const { fetch, calls } = fakeFetch({
      "https://oauth2.googleapis.com/revoke": new Error("offline"),
    })
    await expect(revokeGoogleToken(fetch, creds)).resolves.toBeUndefined()
    expect(calls[0]!.body).toBe("token=refresh-1")
  })
})

describe("listGoogleCalendars", () => {
  it("pages through the list, primary first", async () => {
    const { fetch, calls } = fakeFetch({
      [`${LIST}?maxResults=250&pageToken=p2`]: { body: { items: [primary] } },
      [LIST]: { body: { items: [team], nextPageToken: "p2" } },
    })
    expect(await listGoogleCalendars(fetch, "access-1")).toEqual([
      {
        externalId: "chris@example.com",
        key: "chris@example.com",
        name: "chris@example.com",
        url: "https://calendar.google.com/calendar/r?cid=chris%40example.com",
        description: "Your primary calendar",
        private: false,
      },
      {
        externalId: "team@group.calendar.google.com",
        key: "Team (mine)",
        name: "Team (mine)",
        url: "https://calendar.google.com/calendar/r?cid=team%40group.calendar.google.com",
        description: "Shared",
        private: false,
      },
    ])
    expect(calls).toHaveLength(2)
    expect(calls[0]!.headers.authorization).toBe("Bearer access-1")
  })
})

describe("createIntegrations with Google", () => {
  let t: TestDatabase
  let userId: string
  beforeAll(async () => {
    t = await createTestDatabase()
    userId = (await t.seed.user()).id
  })
  afterAll(() => t.close())

  const google = (routes: Parameters<typeof fakeFetch>[0] = {}) => {
    const fake = fakeFetch({
      [TOKEN]: { body: tokens() },
      [`${LIST}/primary`]: { body: primary },
      [LIST]: { body: { items: [primary, team] } },
      ...routes,
    })
    return {
      ...fake,
      integrations: createIntegrations({
        services: t.services,
        fetch: fake.fetch,
        google: config,
      }),
    }
  }

  it("needs the OAuth client to connect", () => {
    const integrations = createIntegrations({ services: t.services })
    expect(() =>
      integrations.googleAuthorizeUrl({ state: "s", codeChallenge: "c" })
    ).toThrow(/GOOGLE_CLIENT_ID/)
    expect(
      google()
        .integrations.providers()
        .find((p) => p.id === "google")
    ).toMatchObject({ configured: true, fields: [] })
  })

  it("never takes pasted credentials for Google", async () => {
    await expect(
      google().integrations.connect(userId, "google", {})
    ).rejects.toThrow(/Connect button/)
  })

  it("connects as the primary calendar's owner and selects it", async () => {
    const connection = await google().integrations.connectGoogle(
      userId,
      "code-1",
      "verifier-1"
    )
    expect(connection).toMatchObject({
      provider: "google",
      account: "chris@example.com",
      resources: [
        { externalId: "chris@example.com", key: "chris@example.com" },
      ],
    })
    expect(
      await t.services.integrations.credentials(userId, "google")
    ).toMatchObject({
      refreshToken: "refresh-1",
    })
  })

  it("lists calendars and selects by name", async () => {
    const { integrations } = google()
    expect(
      (await integrations.available(userId, "google")).map((r) => r.key)
    ).toEqual(["chris@example.com", "Team (mine)"])
    const connection = await integrations.select(userId, "google", [
      "team (mine)",
    ])
    expect(connection.resources.map((r) => r.externalId)).toEqual([
      "team@group.calendar.google.com",
    ])
  })

  it("keeps the selection when reconnecting", async () => {
    const connection = await google().integrations.connectGoogle(
      userId,
      "code-2",
      "verifier-2"
    )
    expect(connection.resources.map((r) => r.key)).toEqual(["Team (mine)"])
  })

  it("refreshes an expired access token and stores the new one", async () => {
    await t.services.integrations.updateCredentials(userId, "google", {
      refreshToken: "refresh-1",
      accessToken: "stale",
      expiresAt: "2026-01-01T00:00:00.000Z",
    })
    const { integrations, calls } = google({
      [TOKEN]: { body: tokens({ access_token: "access-2" }) },
    })
    expect(await integrations.googleAccessToken(userId)).toBe("access-2")
    expect(await integrations.googleAccessToken(userId)).toBe("access-2")
    expect(calls.filter((c) => c.url === TOKEN)).toHaveLength(1)
  })

  it("only lets the user disconnect, and revokes the grant", async () => {
    const { integrations, calls } = google()
    await expect(
      integrations.disconnect(agentActor(userId, "c", "Bot"), "google")
    ).rejects.toThrow()
    await integrations.disconnect(
      userActor({ id: userId, name: "Chris" }),
      "google"
    )
    expect(calls.map((c) => c.url)).toContain(
      "https://oauth2.googleapis.com/revoke"
    )
    expect(await t.services.integrations.get(userId, "google")).toBeNull()
  })
})

describe("googleConfig", () => {
  it("is null until both client values are set", () => {
    const base = { BETTER_AUTH_URL: "https://daily.test" }
    expect(googleConfig(base)).toBeNull()
    expect(googleConfig({ ...base, GOOGLE_CLIENT_ID: "id" })).toBeNull()
    expect(
      googleConfig({
        ...base,
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "s",
      })
    ).toEqual({
      clientId: "id",
      clientSecret: "s",
      redirectUri: "https://daily.test/api/integrations/google/callback",
    })
  })
})
