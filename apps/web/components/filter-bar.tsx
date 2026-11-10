"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Toggle } from "@workspace/ui/components/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { SearchIcon, XIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { hasFilters, serializeFilters, type TaskFilters } from "@/lib/filters"
import { PRIORITY_OPTIONS } from "@/lib/task-form"
import type { TaskOptions } from "@/lib/task-options"

const ALL = "__all__"

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | undefined
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}) {
  const items = [{ value: ALL, label }, ...options]
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) =>
        onChange(!next || next === ALL ? undefined : next)
      }
      items={items}
    >
      <SelectTrigger size="sm" aria-label={label} className="w-auto min-w-32">
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

const DUE_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "none", label: "No due date" },
]

/** Filters stored in the URL, shared by the board and the task list. */
export function FilterBar({
  filters,
  options,
  sortable = false,
}: {
  filters: TaskFilters
  options: Pick<TaskOptions, "projects" | "labels">
  sortable?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(filters.q ?? "")
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const update = (patch: Partial<TaskFilters>) => {
    const search = serializeFilters({ ...filters, ...patch })
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search tasks"
          placeholder="Search or #number"
          className="h-8 w-56 pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            clearTimeout(debounce.current)
            const q = e.target.value
            debounce.current = setTimeout(
              () => update({ q: q.trim() || undefined }),
              300
            )
          }}
        />
      </div>
      <FilterSelect
        label="All projects"
        value={filters.project}
        options={options.projects.map((p) => ({ value: p.id, label: p.name }))}
        onChange={(project) => update({ project })}
      />
      <FilterSelect
        label="All labels"
        value={filters.label}
        options={options.labels.map((l) => ({ value: l.id, label: l.name }))}
        onChange={(label) => update({ label })}
      />
      <FilterSelect
        label="Any due date"
        value={filters.due}
        options={DUE_OPTIONS}
        onChange={(due) => update({ due: due as TaskFilters["due"] })}
      />
      <ToggleGroup
        multiple
        size="sm"
        variant="outline"
        aria-label="Priority"
        value={filters.priority}
        onValueChange={(priority) =>
          update({ priority: priority as TaskFilters["priority"] })
        }
      >
        {PRIORITY_OPTIONS.filter((p) => p.value !== "none").map((p) => (
          <ToggleGroupItem key={p.value} value={p.value}>
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Toggle
        size="sm"
        variant="outline"
        pressed={filters.cancelled}
        onPressedChange={(cancelled) => update({ cancelled })}
      >
        Show cancelled
      </Toggle>
      {sortable && (
        <FilterSelect
          label="Board order"
          value={filters.sort}
          options={[
            { value: "updated", label: "Recently updated" },
            { value: "due", label: "Due date" },
          ]}
          onChange={(sort) => update({ sort: sort as TaskFilters["sort"] })}
        />
      )}
      {hasFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("")
            update({
              q: undefined,
              project: undefined,
              label: undefined,
              priority: [],
              due: undefined,
            })
          }}
        >
          <XIcon />
          Clear
        </Button>
      )}
    </div>
  )
}
