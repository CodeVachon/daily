import { requireSession } from "@/lib/session"

import { SignOutButton } from "./sign-out-button"

export default async function Page() {
  const { user } = await requireSession()

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Signed in as {user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
