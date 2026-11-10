"use client"

import { signIn } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { useState } from "react"

export function SignInButton() {
  const [pending, setPending] = useState(false)

  return (
    <Button
      className="w-full"
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
      {pending && <Spinner />}
      {pending ? "Redirecting…" : "Continue with GitHub"}
    </Button>
  )
}
