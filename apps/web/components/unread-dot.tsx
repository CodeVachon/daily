import { cn } from "@workspace/ui/lib/utils"

/** A small dot before a task title: an agent or sync changed it since you looked. */
export function UnreadDot({
  unread,
  className,
}: {
  unread?: boolean
  className?: string
}) {
  if (!unread) return null
  return (
    <span
      role="img"
      aria-label="Unread changes"
      title="Changed by an agent or sync since you last opened it"
      className={cn("size-2 shrink-0 rounded-full bg-primary", className)}
    />
  )
}
