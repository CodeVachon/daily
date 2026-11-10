import { CircleDotIcon, GitPullRequestIcon, TicketIcon } from "lucide-react"

import type { LinkView } from "@/lib/links"

const ICONS: Record<LinkView["icon"], React.ReactNode> = {
  pr: <GitPullRequestIcon aria-label="Pull request" />,
  issue: <CircleDotIcon aria-label="GitHub issue" />,
  jira: <TicketIcon aria-label="Jira issue" />,
}

/** Pull request, GitHub issue or Jira ticket. */
export function LinkIcon({ icon }: { icon: LinkView["icon"] }) {
  return ICONS[icon]
}
