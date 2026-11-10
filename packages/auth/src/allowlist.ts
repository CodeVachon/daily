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

/** Shape of what Better Auth's GitHub provider returns from getUserInfo. */
interface ProviderUserInfo {
  data?: unknown
}

/** GitHub login from a provider's raw profile, if present. */
export function githubLogin(info: ProviderUserInfo | null): string | undefined {
  const data = info?.data as { login?: unknown } | undefined
  return typeof data?.login === "string" ? data.login : undefined
}

/**
 * Wraps a provider's getUserInfo so only allowlisted GitHub logins get
 * through. Returning null makes Better Auth abort the OAuth callback before
 * any user/account/session is written.
 */
export function gateGithubUserInfo<Token, Info extends ProviderUserInfo>(
  getUserInfo: (token: Token) => Promise<Info | null>,
  allowlist: ReadonlySet<string>,
  onReject: (login: string | undefined) => void = () => {}
): (token: Token) => Promise<Info | null> {
  return async (token) => {
    const info = await getUserInfo(token)
    const login = githubLogin(info)
    if (isAllowedGithubLogin(allowlist, login)) return info
    onReject(login)
    return null
  }
}
