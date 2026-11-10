"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import {
  CircleAlertIcon,
  CircleDotIcon,
  GitPullRequestIcon,
  RefreshCwIcon,
  TicketIcon,
  XIcon,
} from "lucide-react"

import {
  addLinkAction,
  refreshLinksAction,
  removeLinkAction,
} from "@/app/(app)/tasks/link-actions"
import type { LinkView } from "@/lib/links"

import { AddInput } from "./add-input"
import { Section } from "./section"
import { useAction } from "./use-action"

const ICONS: Record<LinkView["icon"], React.ReactNode> = {
  pr: <GitPullRequestIcon aria-label="Pull request" />,
  issue: <CircleDotIcon aria-label="GitHub issue" />,
  jira: <TicketIcon aria-label="Jira issue" />,
}

/** The state badge; hovering it explains a failed sync. */
function StateBadge({ link }: { link: LinkView }) {
  if (!link.state) return null
  const badge = (
    <Badge variant={link.state.variant} className="shrink-0">
      {link.syncError && <CircleAlertIcon />}
      {link.state.label}
    </Badge>
  )
  if (!link.syncError) return badge
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />}>{badge}</TooltipTrigger>
      <TooltipContent>Sync failed: {link.syncError}</TooltipContent>
    </Tooltip>
  )
}

/** "KEY - Title" (truncated) … state … unlink. */
function LinkRow({
  link,
  onRemove,
  disabled,
}: {
  link: LinkView
  onRemove: () => void
  disabled: boolean
}) {
  return (
    <li className="group flex min-w-0 items-center gap-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0">
      <span className="text-muted-foreground">{ICONS[link.icon]}</span>
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate hover:underline"
        title={link.title ? `${link.key} - ${link.title}` : link.url}
      >
        <span className="font-medium">{link.key}</span>
        {link.title && <> - {link.title}</>}
      </a>
      <StateBadge link={link} />
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Unlink ${link.key}`}
        disabled={disabled}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </li>
  )
}

/** GitHub issues/PRs and Jira issues linked to the task. */
export function LinksSection({
  taskId,
  links,
}: {
  taskId: string
  links: LinkView[]
}) {
  const { pending, run } = useAction()
  return (
    <Section
      title="Links"
      aside={
        links.length > 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Refresh links"
            title="Refresh titles and states"
            disabled={pending}
            onClick={() => run(() => refreshLinksAction(taskId))}
          >
            <RefreshCwIcon className={pending ? "animate-spin" : undefined} />
          </Button>
        )
      }
    >
      <ul className="flex flex-col gap-1.5">
        {links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            disabled={pending}
            onRemove={() => run(() => removeLinkAction(link.id))}
          />
        ))}
      </ul>
      <AddInput
        placeholder="Paste a GitHub or Jira link, owner/repo#12 or PROJ-42"
        disabled={pending}
        onAdd={(text) => run(() => addLinkAction(taskId, text))}
      />
    </Section>
  )
}
