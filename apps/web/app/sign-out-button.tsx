"use client"

import { signOut } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await signOut()
        router.replace("/sign-in")
      }}
    >
      Sign out
    </Button>
  )
}
