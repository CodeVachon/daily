const SIGN_IN_ERRORS: Record<string, string> = {
  unable_to_get_user_info:
    "That GitHub account isn't authorized to use this app.",
}

/** User-facing text for a Better Auth `?error=` code on /sign-in. */
export function signInErrorMessage(error: string | undefined): string | null {
  if (!error) return null
  return SIGN_IN_ERRORS[error] ?? "Sign-in failed. Please try again."
}
