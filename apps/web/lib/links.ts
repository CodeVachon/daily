// How a task's external links are shown (motte #41).
import type { LinkChip, LinkStateCategory, TaskLink } from "@workspace/db/core"

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

/** A link on a board card: icon plus its state (or key until synced). */
export interface LinkBadge {
  key: string
  icon: LinkView["icon"]
  label: string
  variant: BadgeVariant
}

/** Board cards show this many links, then "+n". */
export const MAX_CARD_LINKS = 2

export function linkBadges(chips: LinkChip[]): LinkBadge[] {
  return chips.map((chip) => ({
    key: chip.key,
    icon: chip.provider === "jira" ? "jira" : chip.kind,
    label: chip.state ?? chip.key,
    variant: chip.stateCategory ? STATE_VARIANT[chip.stateCategory] : "outline",
  }))
}
