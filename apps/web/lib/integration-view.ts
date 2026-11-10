// What the integrations settings page shows for a connection (motte #38).

export interface ConnectionView {
  account: string
  config: Record<string, string>
}

/** "acme.atlassian.net" for a Jira connection; null when there's no site. */
export function siteHost(connection: ConnectionView | null): string | null {
  const site = connection?.config.site
  return site ? new URL(site).host : null
}

/**
 * Non-secret values to prefill when replacing credentials, so only the token
 * needs typing again. Secrets are never sent back to the browser.
 */
export function replaceDefaults(
  connection: ConnectionView | null
): Record<string, string> {
  const site = connection?.config.site
  return site ? { site, email: connection.account } : {}
}
