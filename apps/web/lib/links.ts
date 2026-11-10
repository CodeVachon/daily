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
  /** The remote title once synced, else the key. */
  label: string
  icon: "pr" | "issue" | "jira"
  state: { label: string; variant: BadgeVariant } | null
  syncError: string | null
}

export function toLinkView(link: TaskLink): LinkView {
  return {
    id: link.id,
    url: link.url,
    key: link.key,
    label: link.title ?? link.key,
    icon: link.provider === "jira" ? "jira" : link.kind,
    state:
      link.state && link.stateCategory
        ? { label: link.state, variant: STATE_VARIANT[link.stateCategory] }
        : null,
    syncError: link.syncError,
  }
}
