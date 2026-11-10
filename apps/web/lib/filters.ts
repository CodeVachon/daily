import {
  PRIORITIES,
  type ListTasksInput,
  type Priority,
} from "@workspace/db/core"

/** Task filters as they live in the URL (shareable, bookmarkable). */
export interface TaskFilters {
  q?: string
  project?: string
  label?: string
  priority: Priority[]
  due?: Exclude<ListTasksInput["due"], undefined>
  /** Show the Cancelled column / cancelled tasks. */
  cancelled: boolean
  sort?: "updated" | "due"
}

const DUE = new Set(["overdue", "today", "week", "none"])
const SORT = new Set(["updated", "due"])

type Params = Record<string, string | string[] | undefined>

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined

export function parseFilters(params: Params): TaskFilters {
  const due = one(params.due)
  const sort = one(params.sort)
  return {
    q: one(params.q),
    project: one(params.project),
    label: one(params.label),
    priority: (one(params.priority)?.split(",") ?? []).filter(
      (p): p is Priority => (PRIORITIES as readonly string[]).includes(p)
    ),
    due: due && DUE.has(due) ? (due as TaskFilters["due"]) : undefined,
    cancelled: one(params.cancelled) === "1",
    sort: sort && SORT.has(sort) ? (sort as TaskFilters["sort"]) : undefined,
  }
}

/** Back to a query string ("" when no filters are set). */
export function serializeFilters(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.project) params.set("project", filters.project)
  if (filters.label) params.set("label", filters.label)
  if (filters.priority.length)
    params.set("priority", filters.priority.join(","))
  if (filters.due) params.set("due", filters.due)
  if (filters.cancelled) params.set("cancelled", "1")
  if (filters.sort) params.set("sort", filters.sort)
  return params.toString()
}

export function hasFilters(filters: TaskFilters): boolean {
  return Boolean(
    filters.q ||
    filters.project ||
    filters.label ||
    filters.priority.length ||
    filters.due
  )
}

/** The service query for these filters. Cancelled tasks only when asked for. */
export function toListInput(filters: TaskFilters): ListTasksInput {
  return {
    text: filters.q,
    projectId: filters.project,
    labelId: filters.label,
    priority: filters.priority.length ? filters.priority : undefined,
    due: filters.due,
    status: filters.cancelled ? undefined : ["open", "active", "done"],
    orderBy: filters.sort ?? "board",
    limit: 200,
  }
}
