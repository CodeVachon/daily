import { services } from "@workspace/db"

import { clientDisplayName, describeScopes } from "@/lib/consent"
import { requireSession } from "@/lib/session"

import { ConsentButtons } from "./consent-buttons"

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
    ? await services.oauthClients.getDisplayInfo(clientId)
    : null
  const scopes = describeScopes(scope)

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 text-sm">
        <h1 className="font-heading text-xl">Authorize agent</h1>
        <p>
          <strong>{clientDisplayName(client, clientId)}</strong> wants to access
          the daily MCP server as <strong>{user.name}</strong>.
        </p>
        {client?.uri && (
          <p className="break-all text-muted-foreground">{client.uri}</p>
        )}
        <ul className="list-disc pl-5">
          {scopes.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <ConsentButtons />
      </div>
    </div>
  )
}
