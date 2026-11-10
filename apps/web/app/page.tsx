import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { initials } from "@/lib/initials"
import { requireSession } from "@/lib/session"

import { SignOutButton } from "./sign-out-button"

export default async function Page() {
  const { user } = await requireSession()

  return (
    <main className="flex min-h-svh p-6">
      <Card className="h-fit w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              {user.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle>Signed in as {user.name}</CardTitle>
              <CardDescription className="truncate">
                {user.email}
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <SignOutButton />
          </CardAction>
        </CardHeader>
      </Card>
    </main>
  )
}
