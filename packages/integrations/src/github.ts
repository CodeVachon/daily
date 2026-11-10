// GitHub REST: a personal access token, scoped to the repositories chosen.
import { z } from "zod"

import { getJson } from "./http"
import type { AvailableResource, Fetch, Provider } from "./types"

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
}
