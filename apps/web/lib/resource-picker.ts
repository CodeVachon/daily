// Pure helpers for the integration resource picker (motte #38).

export interface PickerResource {
  externalId: string
  key: string
  name: string
  description: string | null
}

/** Resources whose key, name or description contains every word of `query`. */
export function filterResources<R extends PickerResource>(
  resources: R[],
  query: string
): R[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return resources
  return resources.filter((r) => {
    const text = `${r.key} ${r.name} ${r.description ?? ""}`.toLowerCase()
    return words.every((word) => text.includes(word))
  })
}

/** `selected` with `id` added or removed. */
export function toggle(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** Whether the picked ids differ from what's saved. */
export function isDirty(saved: string[], selected: Set<string>): boolean {
  return saved.length !== selected.size || saved.some((id) => !selected.has(id))
}

/** Selected first (as saved), then the rest; each group keeps its order. */
export function selectedFirst<R extends PickerResource>(
  resources: R[],
  saved: string[]
): R[] {
  const inScope = new Set(saved)
  return [
    ...resources.filter((r) => inScope.has(r.externalId)),
    ...resources.filter((r) => !inScope.has(r.externalId)),
  ]
}

/** "1 repository selected", "3 projects selected". */
export function selectionLabel(
  count: number,
  noun: { one: string; many: string }
): string {
  return `${count} ${count === 1 ? noun.one : noun.many} selected`
}
