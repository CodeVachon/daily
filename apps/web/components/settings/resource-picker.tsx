"use client"

import type { AvailableResource, ProviderInfo } from "@workspace/integrations"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { LockIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { selectIntegrationResourcesAction } from "@/app/(app)/settings/integrations/actions"
import { useAction } from "@/components/task/use-action"
import {
  filterResources,
  isDirty,
  selectedFirst,
  selectionLabel,
  toggle,
} from "@/lib/resource-picker"

function ResourceRow({
  id,
  resource: r,
  checked,
  onToggle,
}: {
  id: string
  resource: AvailableResource
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        onCheckedChange={onToggle}
      />
      <Label
        htmlFor={id}
        className="flex flex-1 flex-col items-start gap-0.5 font-normal"
      >
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{r.key}</span>
          {r.name !== r.key && (
            <span className="text-muted-foreground">{r.name}</span>
          )}
          {r.private && (
            <Badge variant="outline">
              <LockIcon />
              Private
            </Badge>
          )}
        </span>
        {r.description && (
          <span className="text-xs text-muted-foreground">{r.description}</span>
        )}
      </Label>
    </li>
  )
}

function ResourceList({
  provider,
  shown,
  selected,
  onToggle,
  query,
}: {
  provider: ProviderInfo
  shown: AvailableResource[]
  selected: Set<string>
  onToggle: (externalId: string) => void
  query: string
}) {
  return (
    <ul className="max-h-96 divide-y overflow-y-auto rounded-md border">
      {shown.map((r) => (
        <ResourceRow
          key={r.externalId}
          id={`${provider.id}-${r.externalId}`}
          resource={r}
          checked={selected.has(r.externalId)}
          onToggle={() => onToggle(r.externalId)}
        />
      ))}
      {shown.length === 0 && (
        <li className="px-3 py-6 text-center text-sm text-muted-foreground">
          No {provider.resourceNoun.many} match “{query}”.
        </li>
      )}
    </ul>
  )
}

function Picker({
  provider,
  available,
  saved,
}: {
  provider: ProviderInfo
  available: AvailableResource[]
  saved: string[]
}) {
  const { pending, run } = useAction()
  const [selected, setSelected] = useState(() => new Set(saved))
  const [query, setQuery] = useState("")
  // Order once (selected first) so rows don't jump while ticking.
  const ordered = useMemo(
    () => selectedFirst(available, saved),
    [available, saved]
  )
  const many = provider.resourceNoun.many

  async function save() {
    const ok = await run(() =>
      selectIntegrationResourcesAction(provider.id, [...selected])
    )
    if (ok) toast.success(`${provider.name} scope saved`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          type="search"
          placeholder={`Filter ${available.length} ${many}…`}
          aria-label={`Filter ${many}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {selectionLabel(selected.size, provider.resourceNoun)}
        </span>
        <Button
          className="ml-auto"
          onClick={save}
          disabled={pending || !isDirty(saved, selected)}
        >
          Save
        </Button>
      </div>
      <ResourceList
        provider={provider}
        shown={filterResources(ordered, query)}
        selected={selected}
        onToggle={(id) => setSelected(toggle(selected, id))}
        query={query}
      />
    </div>
  )
}

/** Choose which repositories/projects are in scope; saved on demand. */
export function ResourcePicker(props: {
  provider: ProviderInfo
  available: AvailableResource[]
  /** External ids currently in scope. */
  saved: string[]
}) {
  if (props.available.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        These credentials can’t see any {props.provider.resourceNoun.many}.
      </p>
    )
  return <Picker {...props} />
}
