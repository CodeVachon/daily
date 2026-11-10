// GitHub REST: a personal access token, scoped to the repositories chosen.
import type { RemoteState } from "@workspace/db/core"
import { z } from "zod"

import { getJson } from "./http"
import type { AvailableResource, Fetch, LinkRef, Provider } from "./types"

const API = "https://api.github.com"
const PAGE_SIZE = 100
/** 1,000 repositories is plenty for a picker. */
const MAX_PAGES = 10

const credentials = z.object({
  token: z.string().trim().min(1, "Enter a GitHub token"),
})
type GitHubCredentials = z.infer<typeof credentials>

interface GitHubRepo {
  id: number
  full_name: string
  html_url: string
  description: string | null
  private: boolean
}

const get = <T>(fetch: Fetch, { token }: GitHubCredentials, path: string) =>
  getJson<T>(fetch, "GitHub", `${API}${path}`, {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  })

const toResource = (repo: GitHubRepo): AvailableResource => ({
  externalId: String(repo.id),
  key: repo.full_name,
  name: repo.full_name,
  url: repo.html_url,
  description: repo.description,
  private: repo.private,
})

interface GitHubIssue {
  title: string
  state: "open" | "closed"
  state_reason?: string | null
  assignee?: { login: string } | null
  updated_at: string
  pull_request?: { merged_at: string | null } | null
  draft?: boolean
}

/** "owner/repo#12" → ["owner/repo", "12"]. */
function parts(key: string): [string, string] {
  const at = key.lastIndexOf("#")
  return [key.slice(0, at), key.slice(at + 1)]
}

/** Normalize an issue or PR (the issues API returns both). */
export function githubState(item: GitHubIssue): RemoteState {
  const isPr = Boolean(item.pull_request)
  let state: string = item.state
  let category: RemoteState["stateCategory"] = "open"
  if (isPr && item.pull_request?.merged_at) state = category = "merged"
  else if (item.state === "closed")
    category = !isPr && item.state_reason === "completed" ? "done" : "closed"
  else if (item.draft) state = category = "draft"
  return {
    kind: isPr ? "pr" : "issue",
    title: item.title,
    state,
    stateCategory: category,
    assignee: item.assignee?.login ?? null,
    remoteUpdatedAt: new Date(item.updated_at),
  }
}

export const github: Provider<GitHubCredentials> = {
  id: "github",
  name: "GitHub",
  resourceNoun: { one: "repository", many: "repositories" },
  fields: [
    {
      name: "token",
      label: "Personal access token",
      type: "password",
      placeholder: "github_pat_…",
      description:
        "A fine-grained token with read-only Issues, Pull requests and Metadata access to the repositories you want here.",
    },
  ],
  help: {
    text: "Create a fine-grained personal access token",
    url: "https://github.com/settings/personal-access-tokens/new",
  },
  credentials,

  async verify(creds, fetch) {
    const { login } = await get<{ login: string }>(fetch, creds, "/user")
    return { account: login, config: { login } }
  },

  async listResources(creds, fetch) {
    const repos: GitHubRepo[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await get<GitHubRepo[]>(
        fetch,
        creds,
        `/user/repos?per_page=${PAGE_SIZE}&page=${page}&sort=full_name&affiliation=owner,collaborator,organization_member`
      )
      repos.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return repos.map(toResource)
  },

  scopeOf: (link: LinkRef) => parts(link.key)[0],

  async fetchItem(creds, link, fetch) {
    const [repo, number] = parts(link.key)
    return githubState(
      await get<GitHubIssue>(fetch, creds, `/repos/${repo}/issues/${number}`)
    )
  },
}
