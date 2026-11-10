"use client"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { XIcon } from "lucide-react"

import {
  addChecklistItemAction,
  removeChecklistItemAction,
  toggleChecklistItemAction,
} from "@/app/(app)/tasks/collaboration-actions"

import { AddInput } from "./add-input"
import { Section } from "./section"
import { useAction } from "./use-action"

export interface ChecklistItemView {
  id: string
  text: string
  done: boolean
}

export function ChecklistSection({
  taskId,
  items,
}: {
  taskId: string
  items: ChecklistItemView[]
}) {
  const { pending, run } = useAction()
  const done = items.filter((i) => i.done).length

  return (
    <Section
      title="Checklist"
      aside={items.length ? `${done}/${items.length}` : undefined}
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 text-sm">
            <Checkbox
              id={`check-${item.id}`}
              checked={item.done}
              disabled={pending}
              onCheckedChange={(checked) =>
                run(() => toggleChecklistItemAction(item.id, checked === true))
              }
            />
            <label
              htmlFor={`check-${item.id}`}
              className={
                item.done
                  ? "flex-1 text-muted-foreground line-through"
                  : "flex-1"
              }
            >
              {item.text}
            </label>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remove "${item.text}"`}
              onClick={() => run(() => removeChecklistItemAction(item.id))}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
      <AddInput
        placeholder="Add a checklist item"
        disabled={pending}
        onAdd={(text) => run(() => addChecklistItemAction(taskId, text))}
      />
    </Section>
  )
}
