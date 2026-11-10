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
  ListChecksIcon,
  ListTreeIcon,
  MinusIcon,
} from "lucide-react"
import Link from "next/link"

import { ColorBadge } from "@/components/color-badge"
import type { BoardCard } from "@/lib/board"
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

function Progress({
  icon,
  value,
}: {
  icon: React.ReactNode
  value: BoardCard["checklist"]
}) {
  if (!value) return null
  return (
    <Badge variant="ghost">
      {icon}
      {value.done}/{value.total}
    </Badge>
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
      <Progress icon={<ListChecksIcon />} value={card.checklist} />
      <Progress icon={<ListTreeIcon />} value={card.subtasks} />
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

  return (
    <Card
      ref={ref}
      size="sm"
      className={cn(
        "cursor-grab touch-none select-none",
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
        </CardTitle>
      </CardHeader>
      <CardBadges card={card} />
    </Card>
  )
}
