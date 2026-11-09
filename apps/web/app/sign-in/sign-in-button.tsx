"use client"

import { signIn } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { useState } from "react"

export function SignInButton() {
  const [pending, setPending] = useState(false)

  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await signIn.social({
          provider: "github",
          callbackURL: "/",
          errorCallbackURL: "/sign-in",
        })
      }}
    >
      {pending ? "Redirecting…" : "Continue with GitHub"}
    </Button>
  )
}
