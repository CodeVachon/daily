"use client"

import type { ProviderInfo } from "@workspace/integrations"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ExternalLinkIcon } from "lucide-react"
import { useState } from "react"

import { disconnectIntegrationAction } from "@/app/(app)/settings/integrations/actions"
import { useAction } from "@/components/task/use-action"
import {
  connectPrompt,
  disconnectNote,
  oauthStartPath,
  replaceDefaults,
  siteHost,
  type ConnectionView,
} from "@/lib/integration-view"

import { CredentialsForm } from "./credentials-form"

function Disconnect({ provider }: { provider: ProviderInfo }) {
  const { pending, run } = useAction()
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" disabled={pending}>
            Disconnect
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {provider.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The credentials are deleted from Daily. Your choice of{" "}
            {provider.resourceNoun.many} is kept in case you reconnect.{" "}
            {disconnectNote(provider)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => run(() => disconnectIntegrationAction(provider.id))}
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Summary({
  provider,
  connection,
}: {
  provider: ProviderInfo
  connection: ConnectionView | null
}) {
  const many = provider.resourceNoun.many
  if (!connection) return <>{connectPrompt(provider)}</>
  const host = siteHost(connection)
  return (
    <>
      As <span className="font-medium">{connection.account}</span>
      {host && <> on {host}</>}. Only the {many} you choose below are looked at.
    </>
  )
}

function Shell({
  provider,
  connection,
  actions,
  children,
}: {
  provider: ProviderInfo
  connection: ConnectionView | null
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {provider.name}
          <Badge variant={connection ? "secondary" : "outline"}>
            {connection ? "Connected" : "Not connected"}
          </Badge>
        </CardTitle>
        <CardDescription>
          <Summary provider={provider} connection={connection} />
        </CardDescription>
        {actions && <CardAction className="flex gap-1">{actions}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** OAuth: a link to the provider's consent page (when the server can). */
function OAuthConnect({ provider }: { provider: ProviderInfo }) {
  if (!provider.configured)
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Not set up on this server yet: add the OAuth client to the env file (see
        the README), then restart Daily.
        <Button
          variant="link"
          nativeButton={false}
          render={
            <a href={provider.help.url} target="_blank" rel="noreferrer" />
          }
        >
          {provider.help.text}
          <ExternalLinkIcon />
        </Button>
      </div>
    )
  return (
    <Button nativeButton={false} render={<a href={oauthStartPath(provider)} />}>
      Connect {provider.name}
    </Button>
  )
}

/** How to connect: a credentials form, or the provider's consent page. */
function ConnectBody({
  provider,
  initial,
  onDone,
}: {
  provider: ProviderInfo
  initial?: Record<string, string>
  onDone?: () => void
}) {
  if (provider.auth === "oauth") return <OAuthConnect provider={provider} />
  return (
    <CredentialsForm provider={provider} initial={initial} onDone={onDone} />
  )
}

/** Re-enter credentials, or go through the provider's consent again. */
function ReplaceButton({
  provider,
  onReplace,
}: {
  provider: ProviderInfo
  onReplace: () => void
}) {
  if (provider.auth === "oauth")
    return (
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href={oauthStartPath(provider)} />}
      >
        Reconnect
      </Button>
    )
  return (
    <Button variant="outline" size="sm" onClick={onReplace}>
      Replace credentials
    </Button>
  )
}

/**
 * One provider: how to connect until connected, then who it's connected as
 * and (as children) the resource picker.
 */
export function IntegrationCard({
  provider,
  connection,
  children,
}: {
  provider: ProviderInfo
  connection: ConnectionView | null
  children?: React.ReactNode
}) {
  const [replacing, setReplacing] = useState(false)

  if (!connection)
    return (
      <Shell provider={provider} connection={null}>
        <ConnectBody provider={provider} />
      </Shell>
    )
  if (replacing)
    return (
      <Shell provider={provider} connection={connection}>
        <ConnectBody
          provider={provider}
          initial={replaceDefaults(connection)}
          onDone={() => setReplacing(false)}
        />
      </Shell>
    )
  return (
    <Shell
      provider={provider}
      connection={connection}
      actions={
        <>
          <ReplaceButton
            provider={provider}
            onReplace={() => setReplacing(true)}
          />
          <Disconnect provider={provider} />
        </>
      }
    >
      {children}
    </Shell>
  )
}
