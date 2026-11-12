"use client"

import { WEEK_STARTS, weekStartName, type WeekStart } from "@workspace/db/time"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useState } from "react"

import { updateWeekStartAction } from "@/app/(app)/settings/actions"
import { useAction } from "@/components/task/use-action"

const items = WEEK_STARTS.map((day) => ({
  value: day,
  label: weekStartName(day),
}))

/** Pick the day weeks start on; saves on change. */
export function WeekStartForm({ weekStartsOn }: { weekStartsOn: WeekStart }) {
  const { run } = useAction()
  const [value, setValue] = useState(weekStartsOn)

  async function change(next: WeekStart) {
    const previous = value
    setValue(next)
    if (!(await run(() => updateWeekStartAction(next)))) setValue(previous)
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="week-start">Week starts on</FieldLabel>
        <Select
          value={value}
          onValueChange={(next) => next !== null && change(next)}
          items={items}
        >
          <SelectTrigger id="week-start" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          The first day of the Calendar&apos;s week and month views, and of
          &ldquo;due this week&rdquo;.
        </FieldDescription>
      </Field>
    </FieldGroup>
  )
}
