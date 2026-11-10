const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your identity",
  profile: "Read your name and avatar",
  email: "Read your email address",
  offline_access: "Stay connected (refresh tokens)",
}

/** Human labels for a space-separated OAuth scope string. */
export function describeScopes(scope: string | undefined): string[] {
  return (scope ?? "")
    .split(" ")
    .filter(Boolean)
    .map((s) => SCOPE_LABELS[s] ?? s)
}

/** Name to show for the client asking for consent. */
export function clientDisplayName(
  client: { name: string | null } | null,
  clientId: string | undefined
): string {
  return client?.name ?? clientId ?? "An unknown client"
}

/** Outcome of `authClient.oauth2.consent`: where to go, or what went wrong. */
export function consentOutcome(result: {
  data?: { url?: string } | null
  error?: { message?: string } | null
}): { redirectTo: string } | { error: string } {
  if (result.data?.url) return { redirectTo: result.data.url }
  return {
    error:
      result.error?.message ??
      "Something went wrong. Try again from the agent.",
  }
}
