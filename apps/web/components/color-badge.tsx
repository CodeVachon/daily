import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import type { Chip } from "@/lib/board"
import { chipClass, dotClass } from "@/lib/colors"

/**
 * A project or label, shown in its colour (dot + tinted chip). Uncoloured
 * chips fall back to a plain badge variant.
 */
export function ColorBadge({
  chip,
  fallback = "outline",
}: {
  chip: Chip
  fallback?: "outline" | "secondary"
}) {
  return (
    <Badge
      variant={chip.color ? "outline" : fallback}
      className={chipClass(chip.color)}
    >
      <span
        className={cn("size-1.5 rounded-full", dotClass(chip.color))}
        aria-hidden
      />
      {chip.name}
    </Badge>
  )
}
