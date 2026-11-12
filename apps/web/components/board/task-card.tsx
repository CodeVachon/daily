"use client"

import type { Priority } from "@workspace/db/core"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { useSortable } from "@dnd-kit/react/sortable"
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  CalendarIcon,
  MinusIcon,
} from "lucide-react"
import Link from "next/link"

import { ColorBadge } from "@/components/color-badge"
import { CompletionSummary } from "@/components/completion-summary"
import { LinkIcon } from "@/components/link-icon"
import { useLiveFlash } from "@/components/live-updates"
import { UnreadDot } from "@/components/unread-dot"
import type { BoardCard } from "@/lib/board"
import { MAX_CARD_LINKS, type LinkBadge } from "@/lib/links"
import { taskHref } from "@/lib/task-form"

const PRIORITY_ICON: Record<Priority, React.ReactNode> = {
  urgent: (
    <AlertTriangleIcon className="text-destructive" aria-label="Urgent" />
  ),
  high: <ArrowUpIcon className="text-orange-500" aria-label="High priority" />,
  medium: (
    <MinusIcon className="text-muted-foreground" aria-label="Medium priority" />
  ),
  low: (
    <ArrowDownIcon
      className="text-muted-foreground"
      aria-label="Low priority"
    />
  ),
  none: null,
}

function DueBadge({ due }: { due: NonNullable<BoardCard["due"]> }) {
  return (
    <Badge
      variant={due.overdue ? "destructive" : "outline"}
      className={cn(due.today && "border-amber-500 text-amber-600")}
    >
      <CalendarIcon />
      {due.label}
    </Badge>
  )
}

/** Linked PRs / issues with their state; the first few, then "+n". */
function LinkBadges({ links = [] }: { links?: LinkBadge[] }) {
  const extra = links.length - MAX_CARD_LINKS
  return (
    <>
      {links.slice(0, MAX_CARD_LINKS).map((link) => (
        <Badge key={link.key} variant={link.variant} title={link.key}>
          <LinkIcon icon={link.icon} />
          {link.label}
        </Badge>
      ))}
      {extra > 0 && <Badge variant="ghost">+{extra}</Badge>}
    </>
  )
}

function CardBadges({ card }: { card: BoardCard }) {
  return (
    <CardContent className="flex flex-wrap gap-1 empty:hidden">
      {card.due && <DueBadge due={card.due} />}
      {card.openBlockers > 0 && (
        <Badge variant="destructive">
          <BanIcon />
          Blocked by {card.openBlockers}
        </Badge>
      )}
      {card.project && <ColorBadge chip={card.project} fallback="secondary" />}
      {card.labels.map((label) => (
        <ColorBadge key={label.name} chip={label} />
      ))}
      <LinkBadges links={card.links} />
    </CardContent>
  )
}

export function TaskCard({
  card,
  column,
  index,
}: {
  card: BoardCard
  column: string
  index: number
}) {
  const { ref, isDragging } = useSortable({
    id: card.id,
    index,
    group: column,
    type: "item",
    accept: "item",
  })

  const flash = useLiveFlash(card.id)

  return (
    <Card
      ref={ref}
      size="sm"
      data-flash={flash || undefined}
      className={cn(
        "cursor-grab touch-none transition-shadow duration-700 select-none data-flash:ring-2 data-flash:ring-primary",
        isDragging && "opacity-50"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-start gap-1.5 text-sm font-normal [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
          {PRIORITY_ICON[card.priority]}
          <Link
            href={card.href ?? taskHref(card.number)}
            scroll={false}
            className="hover:underline"
            draggable={false}
          >
            <span className="text-muted-foreground">#{card.number}</span>{" "}
            {card.title}
          </Link>
          <CompletionSummary completion={card.completion} />
          <UnreadDot unread={card.unread} className="mt-1.5 ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardBadges card={card} />
    </Card>
  )
}
