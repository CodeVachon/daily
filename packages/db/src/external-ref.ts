// Links from tasks to GitHub / Jira items (motte #36). Database-free.
import type { IntegrationProvider } from "./integration-inputs"

export const LINK_KINDS = ["issue", "pr"] as const
export type LinkKind = (typeof LINK_KINDS)[number]

/** Normalized remote state, as the sync worker records it. */
export const LINK_STATE_CATEGORIES = [
  "open",
  "draft",
  "merged",
  "closed",
  "done",
] as const
export type LinkStateCategory = (typeof LINK_STATE_CATEGORIES)[number]

export interface ExternalRef {
  provider: IntegrationProvider
  /**
   * GitHub shorthand can't tell an issue from a PR; it starts as "issue"
   * and sync corrects it.
   */
  kind: LinkKind
  /** "owner/repo#12" or "PROJ-42". */
  key: string
  /** Canonical URL to open the item. */
  url: string
}

export interface ParseContext {
  /** The connected Jira site ("https://acme.atlassian.net"), for "PROJ-42". */
  jiraSite?: string | null
}

const GITHUB_URL =
  /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)(?:[/?#].*)?$/i
const GITHUB_SHORT = /^([\w.-]+)\/([\w.-]+)#(\d+)$/
const JIRA_KEY = /^([A-Z][A-Z0-9_]+-\d+)$/
const JIRA_KEY_IN_URL = /(?:\/browse\/|[?&]selectedIssue=)([A-Z][A-Z0-9_]+-\d+)/
const JIRA_HOST = /^[a-z0-9][a-z0-9-]*\.atlassian\.net$/

function github(owner: string, repo: string, kind: LinkKind, n: string) {
  const path = kind === "pr" ? "pull" : "issues"
  return {
    provider: "github" as const,
    kind,
    key: `${owner}/${repo}#${n}`,
    url: `https://github.com/${owner}/${repo}/${path}/${n}`,
  }
}

const jira = (site: string, key: string): ExternalRef => ({
  provider: "jira",
  kind: "issue",
  key,
  url: `${site}/browse/${key}`,
})

function jiraFromUrl(input: string): ExternalRef | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }
  const key = `${url.pathname}${url.search}`.match(JIRA_KEY_IN_URL)?.[1]
  if (url.protocol !== "https:" || !JIRA_HOST.test(url.hostname) || !key)
    return null
  return jira(url.origin, key)
}

/**
 * What a pasted link or shorthand points at, or null if it isn't a GitHub
 * issue/PR or a Jira issue. Accepts:
 * - https://github.com/owner/repo/issues/12, …/pull/34 (any trailing path)
 * - owner/repo#12
 * - https://acme.atlassian.net/browse/PROJ-42 (or a board ?selectedIssue=)
 * - PROJ-42, using the connected Jira site
 */
export function parseExternalRef(
  input: string,
  context: ParseContext = {}
): ExternalRef | null {
  const value = input.trim()
  const gh = value.match(GITHUB_URL)
  if (gh) {
    const [, owner, repo, path, n] = gh
    return github(
      owner!,
      repo!,
      path!.toLowerCase() === "pull" ? "pr" : "issue",
      n!
    )
  }
  const short = value.match(GITHUB_SHORT)
  if (short) return github(short[1]!, short[2]!, "issue", short[3]!)
  const key = value.toUpperCase().match(JIRA_KEY)?.[1]
  if (key && context.jiraSite) return jira(context.jiraSite, key)
  return jiraFromUrl(value)
}

/** Whether `input` is a bare Jira key (needs a connected site to resolve). */
export const isJiraKey = (input: string) =>
  JIRA_KEY.test(input.trim().toUpperCase())
