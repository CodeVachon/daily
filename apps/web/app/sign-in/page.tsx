import { redirect } from "next/navigation"

import { getSession } from "@/lib/session"

import { SignInButton } from "./sign-in-button"

const ERROR_MESSAGES: Record<string, string> = {
  unable_to_get_user_info:
    "That GitHub account isn't authorized to use this app.",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await getSession()) redirect("/")

  const { error } = await searchParams
  const message = error
    ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.")
    : null

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="font-heading text-xl">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Access is limited to approved GitHub accounts.
        </p>
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <SignInButton />
      </div>
    </div>
  )
}
