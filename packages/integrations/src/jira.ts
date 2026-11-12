// Jira Cloud REST v3: site + email + API token, scoped to the projects chosen.
import type { RemoteState } from "@workspace/db/core"
import { z } from "zod"

import { getJson, ProviderError } from "./http"
import type { Fetch, LinkRef, Provider } from "./types"

const PAGE_SIZE = 50
const MAX_PAGES = 20

/**
 * "acme", "acme.atlassian.net" or a full URL → "https://acme.atlassian.net".
 * Only Atlassian Cloud sites: the server never calls an arbitrary host.
 */
export function jiraSite(input: string): string | null {
  const value = input.trim().toLowerCase()
  if (!value) return null
  const withHost = value.includes(".") ? value : `${value}.atlassian.net`
  try {
    const url = new URL(
      withHost.includes("://") ? withHost : `https://${withHost}`
    )
    const ok =
      url.protocol === "https:" &&
      /^[a-z0-9][a-z0-9-]*\.atlassian\.net$/.test(url.hostname)
    return ok ? url.origin : null
  } catch {
    return null
  }
}

const credentials = z.object({
  site: z.string().transform((value, ctx) => {
    const site = jiraSite(value)
    if (!site)
      ctx.addIssue({
        code: "custom",
        message: "Enter your Jira Cloud site, like acme.atlassian.net",
      })
    return site ?? ""
  }),
  email: z.string().trim().email("Enter the email you sign in to Jira with"),
  apiToken: z.string().trim().min(1, "Enter a Jira API token"),
})
type JiraCredentials = z.infer<typeof credentials>

interface JiraProjectPage {
  isLast?: boolean
  values: { id: string; key: string; name: string; description?: string }[]
}

const get = <T>(fetch: Fetch, creds: JiraCredentials, path: string) =>
  getJson<T>(fetch, "Jira", `${creds.site}/rest/api/3${path}`, {
    authorization: `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64")}`,
  })

interface JiraIssue {
  fields: {
    summary: string
    status: { name: string; statusCategory: { key: string } }
    assignee?: { displayName: string } | null
    updated?: string
  }
}

/** Jira's status categories: "new" and "indeterminate" are still open. */
export function jiraState({ fields }: JiraIssue): RemoteState {
  return {
    kind: "issue",
    title: fields.summary,
    state: fields.status.name,
    stateCategory:
      fields.status.statusCategory.key === "done" ? "done" : "open",
    assignee: fields.assignee?.displayName ?? null,
    remoteUpdatedAt: fields.updated ? new Date(fields.updated) : null,
  }
}

export const jira: Provider<JiraCredentials> = {
  id: "jira",
  name: "Jira",
  resourceNoun: { one: "project", many: "projects" },
  fields: [
    {
      name: "site",
      label: "Site",
      type: "text",
      placeholder: "acme.atlassian.net",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "you@example.com",
    },
    {
      name: "apiToken",
      label: "API token",
      type: "password",
      description:
        "Jira only shows you what this account can see; pick the projects below.",
    },
  ],
  help: {
    text: "Create an Atlassian API token",
    url: "https://id.atlassian.com/manage-profile/security/api-tokens",
  },
  credentials,

  async verify(creds, fetch) {
    const me = await get<{ emailAddress?: string; displayName?: string }>(
      fetch,
      creds,
      "/myself"
    )
    return {
      account: me.emailAddress ?? creds.email,
      config: { site: creds.site, name: me.displayName ?? creds.email },
    }
  },

  async listResources(creds, fetch) {
    const projects: JiraProjectPage["values"] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await get<JiraProjectPage>(
        fetch,
        creds,
        `/project/search?orderBy=key&maxResults=${PAGE_SIZE}&startAt=${page * PAGE_SIZE}`
      )
      projects.push(...batch.values)
      if (batch.isLast !== false || batch.values.length === 0) break
    }
    return projects.map((p) => ({
      externalId: p.id,
      key: p.key,
      name: p.name,
      url: `${creds.site}/browse/${p.key}`,
      description: p.description ?? null,
      private: false,
    }))
  },

  scopeOf: (link: LinkRef) => link.key.slice(0, link.key.lastIndexOf("-")),

  async fetchItem(creds, link, fetch) {
    if (new URL(link.url).origin !== creds.site)
      throw new ProviderError(
        `${link.key} is on ${new URL(link.url).host}, not the connected site ${new URL(creds.site).host}`
      )
    return jiraState(
      await get<JiraIssue>(
        fetch,
        creds,
        `/issue/${encodeURIComponent(link.key)}?fields=summary,status,assignee,updated`
      )
    )
  },
}
