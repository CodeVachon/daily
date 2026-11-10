// How a task's external links are shown (motte #41).
import type { LinkStateCategory, TaskLink } from "@workspace/db/core"

type BadgeVariant = "default" | "secondary" | "outline"

const STATE_VARIANT: Record<LinkStateCategory, BadgeVariant> = {
  open: "outline",
  draft: "outline",
  merged: "default",
  done: "secondary",
  closed: "secondary",
}

export interface LinkView {
  id: string
  url: string
  key: string
  /** The remote title; null until synced. */
  title: string | null
  icon: "pr" | "issue" | "jira"
  /** The remote state, or "Not synced" (with the reason) when it failed. */
  state: { label: string; variant: BadgeVariant | "destructive" } | null
  syncError: string | null
}

function stateBadge(link: TaskLink): LinkView["state"] {
  if (link.state && link.stateCategory)
    return { label: link.state, variant: STATE_VARIANT[link.stateCategory] }
  if (link.syncError) return { label: "Not synced", variant: "destructive" }
  return null
}

export function toLinkView(link: TaskLink): LinkView {
  return {
    id: link.id,
    url: link.url,
    key: link.key,
    title: link.title,
    icon: link.provider === "jira" ? "jira" : link.kind,
    state: stateBadge(link),
    syncError: link.syncError,
  }
}
