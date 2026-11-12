"use client"

import type { RsvpScope } from "@workspace/db/core"
import { Button } from "@workspace/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useId, useState } from "react"

import { rsvpAction } from "@/app/(app)/calendar/actions"
import { useAction } from "@/components/task/use-action"
import { rsvpChoices, type RsvpView } from "@/lib/meeting"

/** For a recurring meeting: answer this occurrence or every one. */
function ScopeSwitch({
  recurring,
  scope,
  onChange,
}: {
  recurring: boolean
  scope: RsvpScope
  onChange: (scope: RsvpScope) => void
}) {
  const id = useId()
  if (!recurring) return null
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span id={id}>Recurring meeting · answer for</span>
      <ToggleGroup
        size="sm"
        aria-labelledby={id}
        value={[scope]}
        onValueChange={(value) => value[0] && onChange(value[0] as RsvpScope)}
      >
        <ToggleGroupItem value="event" className="h-7 text-xs">
          This event
        </ToggleGroupItem>
        <ToggleGroupItem value="series" className="h-7 text-xs">
          All events
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

/**
 * Accept / Maybe / Decline. Google tells the organizer, as when you answer
 * in Google Calendar; the current answer is highlighted.
 */
export function RsvpButtons({
  rsvp,
  defaultScope = "event",
}: {
  rsvp: RsvpView
  defaultScope?: RsvpScope
}) {
  const [scope, setScope] = useState<RsvpScope>(defaultScope)
  const { pending, run } = useAction()
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex gap-1.5" role="group" aria-label="Your answer">
        {rsvpChoices(rsvp.current).map((choice) => (
          <Button
            key={choice.response}
            size="sm"
            variant={choice.active ? "default" : "outline"}
            aria-pressed={choice.active}
            disabled={pending}
            onClick={() =>
              run(() => rsvpAction(rsvp.eventId, choice.response, scope))
            }
          >
            {choice.label}
          </Button>
        ))}
      </div>
      <ScopeSwitch
        recurring={rsvp.recurring}
        scope={scope}
        onChange={setScope}
      />
    </div>
  )
}
