/**
 * Parses a comma/whitespace-separated list of GitHub usernames into a
 * normalized (lower-cased) set. GitHub logins are case-insensitive.
 */
export function parseAllowlist(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,]+/)
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function isAllowedGithubLogin(
  allowlist: ReadonlySet<string>,
  login: string | undefined | null
): boolean {
  return !!login && allowlist.has(login.toLowerCase())
}
