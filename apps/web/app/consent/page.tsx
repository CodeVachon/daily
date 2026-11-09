import { db } from "@workspace/db"

import { requireSession } from "@/lib/session"

import { ConsentButtons } from "./consent-buttons"

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your identity",
  profile: "Read your name and avatar",
  email: "Read your email address",
  offline_access: "Stay connected (refresh tokens)",
}

// Reached via the OAuth provider's signed redirect when an MCP client
// (e.g. Claude Code) asks to act on your behalf. Accept/deny is verified
// server-side against the signed `oauth_query`.
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; scope?: string }>
}) {
  const { user } = await requireSession()
  const { client_id: clientId, scope } = await searchParams

  const client = clientId
    ? await db.query.oauthClient.findFirst({
        where: (c, { eq }) => eq(c.clientId, clientId),
        columns: { name: true, uri: true },
      })
    : undefined
  const scopes = (scope ?? "").split(" ").filter(Boolean)

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 text-sm">
        <h1 className="font-heading text-xl">Authorize agent</h1>
        <p>
          <strong>{client?.name ?? clientId ?? "An unknown client"}</strong>{" "}
          wants to access the daily MCP server as <strong>{user.name}</strong>.
        </p>
        {client?.uri && (
          <p className="break-all text-muted-foreground">{client.uri}</p>
        )}
        {scopes.length > 0 && (
          <ul className="list-disc pl-5">
            {scopes.map((s) => (
              <li key={s}>{SCOPE_LABELS[s] ?? s}</li>
            ))}
          </ul>
        )}
        <ConsentButtons />
      </div>
    </div>
  )
}
