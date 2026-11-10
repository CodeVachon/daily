import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { CircleAlertIcon } from "lucide-react"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/session"
import { signInErrorMessage } from "@/lib/sign-in"

import { SignInButton } from "./sign-in-button"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await getSession()) redirect("/")

  const { error } = await searchParams
  const message = signInErrorMessage(error)

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Access is limited to approved GitHub accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {message && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <SignInButton />
        </CardContent>
      </Card>
    </main>
  )
}
