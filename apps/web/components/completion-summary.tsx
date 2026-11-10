"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import type { Completion } from "@/lib/board"

/** "(2/3)" after a task title: checklist items and subtasks done. */
export function CompletionSummary({
  completion,
}: {
  completion: Completion | null
}) {
  if (!completion) return null
  const complete = completion.done === completion.total
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "shrink-0 text-muted-foreground tabular-nums",
              complete && "text-emerald-600 dark:text-emerald-400"
            )}
            aria-label={completion.detail}
          />
        }
      >
        {completion.label}
      </TooltipTrigger>
      <TooltipContent>{completion.detail}</TooltipContent>
    </Tooltip>
  )
}
