"use client"

import type { Priority } from "@workspace/db/core"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { CalendarIcon, PlusIcon, TagIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ensureLabelAction } from "@/app/(app)/tasks/actions"
import {
  dueFormLabel,
  EMPTY_DUE,
  fromCalendarDate,
  PRIORITY_OPTIONS,
  toCalendarDate,
  type DueForm,
} from "@/lib/task-form"
import type { TaskOptions } from "@/lib/task-options"

const NO_PROJECT = "__none__"

export function StatusSelect({
  value,
  onChange,
  statuses,
}: {
  value: string
  onChange: (value: string) => void
  statuses: TaskOptions["statuses"]
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onChange(next)}
      items={statuses.map((s) => ({ value: s.key, label: s.name }))}
    >
      <SelectTrigger className="w-full" aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority
  onChange: (value: Priority) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onChange(next)}
      items={PRIORITY_OPTIONS}
    >
      <SelectTrigger className="w-full" aria-label="Priority">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProjectSelect({
  value,
  onChange,
  projects,
}: {
  value: string | null
  onChange: (value: string | null) => void
  projects: TaskOptions["projects"]
}) {
  const items = [
    { value: NO_PROJECT, label: "No project" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ]
  return (
    <Select
      value={value ?? NO_PROJECT}
      onValueChange={(next) =>
        onChange(!next || next === NO_PROJECT ? null : next)
      }
      items={items}
    >
      <SelectTrigger className="w-full" aria-label="Project">
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
  )
}

/** All-day date, or a date and time (in the user's current zone). */
export function DuePicker({
  value,
  onChange,
}: {
  value: DueForm
  onChange: (value: DueForm) => void
}) {
  const label = dueFormLabel(value)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start font-normal"
            aria-label="Due date"
          />
        }
      >
        <CalendarIcon />
        {label ?? <span className="text-muted-foreground">No due date</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={fromCalendarDate(value.date)}
          onSelect={(day) =>
            onChange(day ? { ...value, date: toCalendarDate(day) } : EMPTY_DUE)
          }
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Input
            type="time"
            aria-label="Due time (optional)"
            value={value.time}
            disabled={!value.date}
            onChange={(event) =>
              onChange({ ...value, time: event.target.value })
            }
          />
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_DUE)}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Pick existing labels, or create one from what you typed. */
export function LabelPicker({
  value,
  onChange,
  labels,
}: {
  value: string[]
  onChange: (value: string[]) => void
  labels: TaskOptions["labels"]
}) {
  const [known, setKnown] = useState(labels)
  const [query, setQuery] = useState("")
  const selected = known.filter((l) => value.includes(l.id))
  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    )
  const exists = known.some(
    (l) => l.name.toLowerCase() === query.trim().toLowerCase()
  )

  async function create() {
    const result = await ensureLabelAction(query.trim())
    if (!result.ok) return void toast.error(result.error)
    setKnown((all) => [...all, result.data])
    onChange([...value, result.data.id])
    setQuery("")
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-auto min-h-9 w-full flex-wrap justify-start font-normal"
            aria-label="Labels"
          />
        }
      >
        <TagIcon />
        {selected.length ? (
          selected.map((l) => (
            <Badge key={l.id} variant="secondary">
              {l.name}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">No labels</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Find or create a label…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No labels yet.</CommandEmpty>
            <CommandGroup>
              {known.map((l) => (
                <CommandItem
                  key={l.id}
                  value={l.name}
                  data-checked={value.includes(l.id)}
                  onSelect={() => toggle(l.id)}
                >
                  {l.name}
                </CommandItem>
              ))}
              {query.trim() && !exists && (
                <CommandItem value={`create ${query}`} onSelect={create}>
                  <PlusIcon />
                  Create “{query.trim()}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
