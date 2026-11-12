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

/** Where the Connect button sends the browser for an OAuth provider. */
export const oauthStartPath = (provider: { id: string }) =>
  `/api/integrations/${provider.id}/start`

interface ProviderText {
  name: string
  auth: "credentials" | "oauth"
  resourceNoun: { many: string }
}

/** The card's description before anything is connected. */
export function connectPrompt(provider: ProviderText): string {
  const many = provider.resourceNoun.many
  return provider.auth === "oauth"
    ? `Connect your ${provider.name} account, then choose which ${many} Daily reads.`
    : `Connect with your own credentials, then choose which ${many} Daily may look at.`
}

/** What happens to access on the provider's side when disconnecting. */
export function disconnectNote(provider: ProviderText): string {
  return provider.auth === "oauth"
    ? `Daily also asks ${provider.name} to remove its access.`
    : `Revoke the token with ${provider.name} too if you no longer need it.`
}
