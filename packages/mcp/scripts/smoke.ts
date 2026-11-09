/**
 * End-to-end MCP smoke test against the running dev server.
 *
 *   bun run mcp:smoke        (from the repo root, with `bun run dev` running)
 *
 * Creates a throwaway user + session directly in the DB (bypassing GitHub —
 * needs DB access and BETTER_AUTH_SECRET, so it is dev-only), registers an
 * OAuth client via DCR, runs authorize → consent → token with PKCE, then calls
 * initialize, tools/list and every no-arg tool. Cleans up after itself.
 */
import { auth, MCP_RESOURCE } from "@workspace/auth"
import { db, schema } from "@workspace/db"
import { eq } from "drizzle-orm"

const B = new URL(MCP_RESOURCE).origin
const ctx = await auth.$context
const email = `mcp-smoke-${Date.now()}@example.invalid`
const user = await ctx.internalAdapter.createUser(
  {
    name: "MCP Smoke Test",
    email,
    emailVerified: true,
  },
  { method: "admin" }
)
try {
  const session = await ctx.internalAdapter.createSession(user.id)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ctx.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = Buffer.from(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(session.token)
    )
  ).toString("base64")
  const cookie = `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${sig}`)}`
  const H = { origin: B, cookie }

  const reg = await (
    await fetch(`${B}/api/auth/oauth2/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: B },
      body: JSON.stringify({
        client_name: "MCP smoke test",
        redirect_uris: ["http://127.0.0.1:9999/cb"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        application_type: "native",
      }),
    })
  ).json()
  console.log("1. registered client:", reg.client_id ?? reg)

  const verifier = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32))
  ).toString("base64url")
  const challenge = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  ).toString("base64url")
  const q = new URLSearchParams({
    response_type: "code",
    client_id: reg.client_id,
    redirect_uri: "http://127.0.0.1:9999/cb",
    scope: "openid profile email offline_access",
    state: "xyz",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: MCP_RESOURCE,
  })
  const az = await fetch(`${B}/api/auth/oauth2/authorize?${q}`, {
    headers: H,
    redirect: "manual",
  })
  const consentUrl = new URL(az.headers.get("location")!, B)
  console.log("2. authorize ->", az.status, consentUrl.pathname)

  const page = await fetch(consentUrl, { headers: H })
  console.log(
    "3. consent page:",
    page.status,
    (await page.text()).includes("Authorize agent")
  )

  const cr = await fetch(`${B}/api/auth/oauth2/consent`, {
    method: "POST",
    headers: { ...H, "content-type": "application/json" },
    body: JSON.stringify({
      accept: true,
      oauth_query: consentUrl.search.slice(1),
    }),
  })
  const cj = await cr.json()
  const code = new URL(
    cj.url ?? cj.redirect_uri ?? "http://x/"
  ).searchParams.get("code")
  console.log("4. consent ->", cr.status, code ? "got code" : cj)

  const tok = await (
    await fetch(`${B}/api/auth/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: "http://127.0.0.1:9999/cb",
        client_id: reg.client_id,
        code_verifier: verifier,
        resource: MCP_RESOURCE,
      }),
    })
  ).json()
  console.log(
    "5. token:",
    tok.access_token
      ? `${tok.token_type} (expires_in ${tok.expires_in}, refresh=${!!tok.refresh_token})`
      : tok
  )

  const rpc = async (id: number, method: string, params: object = {}) => {
    const r = await fetch(MCP_RESOURCE, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tok.access_token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    })
    const t = await r.text()
    const line = t.split("\n").find((l) => l.startsWith("data:"))
    return { status: r.status, body: JSON.parse(line ? line.slice(5) : t) }
  }
  const init = await rpc(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  })
  console.log("6. initialize:", init.status, init.body.result?.serverInfo)
  const list = await rpc(2, "tools/list")
  console.log(
    "7. tools/list:",
    list.status,
    list.body.result?.tools?.map((t: { name: string }) => t.name)
  )
  const ping = await rpc(3, "tools/call", { name: "ping", arguments: {} })
  console.log(
    "8. ping:",
    ping.status,
    JSON.stringify(ping.body.result?.structuredContent ?? ping.body)
  )
  const who = await rpc(4, "tools/call", { name: "whoami", arguments: {} })
  console.log(
    "9. whoami:",
    who.status,
    JSON.stringify(who.body.result?.structuredContent ?? who.body)
  )
} finally {
  await db
    .delete(schema.oauthClient)
    .where(eq(schema.oauthClient.name, "MCP smoke test"))
  await db.delete(schema.user).where(eq(schema.user.id, user.id))
  console.log("cleanup: removed test user + client")
  process.exit(0)
}
