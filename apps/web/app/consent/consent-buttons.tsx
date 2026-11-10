"use client"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { useState } from "react"

import { consentOutcome } from "@/lib/consent"

export function ConsentButtons() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(accept: boolean) {
    setPending(true)
    setError(null)
    // oauthProviderClient attaches the signed oauth_query from the URL.
    const outcome = consentOutcome(await authClient.oauth2.consent({ accept }))
    if ("redirectTo" in outcome) {
      window.location.href = outcome.redirectTo
      return
    }
    setError(outcome.error)
    setPending(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => decide(true)}>
          Allow
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => decide(false)}
        >
          Deny
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
