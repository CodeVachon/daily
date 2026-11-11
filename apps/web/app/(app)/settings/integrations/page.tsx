import { services } from "@workspace/db"
import type { IntegrationConnection } from "@workspace/db/core"
import { ProviderError, type ProviderInfo } from "@workspace/integrations"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import { Suspense } from "react"

import { IntegrationCard } from "@/components/settings/integration-card"
import { ResourcePicker } from "@/components/settings/resource-picker"
import { connectNotice, type ConnectNotice } from "@/lib/google-oauth"
import { integrations } from "@/lib/integrations"
import { requireSession } from "@/lib/session"

export const metadata = { title: "Integrations · Settings · Daily" }

/** Asks the provider what the credentials can see (may be slow or fail). */
async function Resources({
  userId,
  provider,
  connection,
}: {
  userId: string
  provider: ProviderInfo
  connection: IntegrationConnection
}) {
  const result = await integrations.available(userId, provider.id).then(
    (available) => ({ available }),
    (error: unknown) => {
      if (error instanceof ProviderError) return { error: error.message }
      throw error
    }
  )
  if ("error" in result)
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Couldn’t load your {provider.resourceNoun.many}</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  return (
    <ResourcePicker
      provider={provider}
      available={result.available}
      saved={connection.resources.map((r) => r.externalId)}
    />
  )
}

/** How connecting Google went, after its redirect back here. */
function Notice({ notice }: { notice: ConnectNotice }) {
  if (!notice) return null
  if (notice.ok)
    return (
      <Alert>
        <CircleCheckIcon />
        <AlertTitle>Google Calendar connected</AlertTitle>
        <AlertDescription>
          Your primary calendar is selected. Choose any others below.
        </AlertDescription>
      </Alert>
    )
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Couldn’t connect Google Calendar</AlertTitle>
      <AlertDescription>{notice.reason}</AlertDescription>
    </Alert>
  )
}

export default async function IntegrationsPage({
  searchParams,
}: PageProps<"/settings/integrations">) {
  const { user } = await requireSession()
  const connections = await services.integrations.list(user.id)
  return (
    <div className="max-w-3xl space-y-4 p-4">
      <Notice notice={connectNotice(await searchParams)} />
      {integrations.providers().map((provider) => {
        const connection = connections.find((c) => c.provider === provider.id)
        return (
          <IntegrationCard
            key={provider.id}
            provider={provider}
            connection={
              connection
                ? { account: connection.account, config: connection.config }
                : null
            }
          >
            {connection && (
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <Resources
                  userId={user.id}
                  provider={provider}
                  connection={connection}
                />
              </Suspense>
            )}
          </IntegrationCard>
        )
      })}
    </div>
  )
}
