"use client"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { useState } from "react"

export function ConsentButtons() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(accept: boolean) {
    setPending(true)
    setError(null)
    // oauthProviderClient attaches the signed oauth_query from the URL.
    const { data, error } = await authClient.oauth2.consent({ accept })
    if (data?.url) {
      window.location.href = data.url
      return
    }
    setError(
      error?.message ?? "Something went wrong. Try again from the agent."
    )
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
