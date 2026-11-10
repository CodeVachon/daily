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
import { useState } from "react"

import { disconnectIntegrationAction } from "@/app/(app)/settings/integrations/actions"
import { useAction } from "@/components/task/use-action"
import {
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
            {provider.resourceNoun.many} is kept in case you reconnect. Revoke
            the token with {provider.name} too if you no longer need it.
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
  if (!connection)
    return (
      <>
        Connect with your own credentials, then choose which {many} Daily may
        look at.
      </>
    )
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

/**
 * One provider: its credentials form until connected, then who it's
 * connected as and (as children) the resource picker.
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
        <CredentialsForm provider={provider} />
      </Shell>
    )
  if (replacing)
    return (
      <Shell provider={provider} connection={connection}>
        <CredentialsForm
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReplacing(true)}
          >
            Replace credentials
          </Button>
          <Disconnect provider={provider} />
        </>
      }
    >
      {children}
    </Shell>
  )
}
