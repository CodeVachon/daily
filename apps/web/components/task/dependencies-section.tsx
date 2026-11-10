"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { PlusIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import {
  addDependencyAction,
  removeDependencyAction,
  searchTasksAction,
} from "@/app/(app)/tasks/collaboration-actions"
import { taskHref } from "@/lib/task-form"

import { Section } from "./section"
import { useAction } from "./use-action"

export interface DependencyView {
  id: string
  number: number
  title: string
  open: boolean
}

type Found = { id: string; number: number; title: string }

/** Search tasks by text or #number and pick one. */
function TaskPicker({
  excludeIds,
  onPick,
}: {
  excludeIds: string[]
  onPick: (task: Found) => void
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Found[]>([])

  async function search(query: string) {
    if (!query.trim()) return setResults([])
    const result = await searchTasksAction(query)
    if (result.ok)
      setResults(result.data.filter((t) => !excludeIds.includes(t.id)))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="w-fit" />}
      >
        <PlusIcon />
        Add blocker
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tasks or #number…"
            onValueChange={search}
          />
          <CommandList>
            <CommandEmpty>Type to search your tasks.</CommandEmpty>
            <CommandGroup>
              {results.map((task) => (
                <CommandItem
                  key={task.id}
                  value={task.id}
                  onSelect={() => {
                    setOpen(false)
                    onPick(task)
                  }}
                >
                  <span className="text-muted-foreground">#{task.number}</span>{" "}
                  {task.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function DependenciesSection({
  taskId,
  blockedBy,
}: {
  taskId: string
  blockedBy: DependencyView[]
}) {
  const { run } = useAction()
  const open = blockedBy.filter((d) => d.open).length
  return (
    <Section
      title="Blocked by"
      aside={blockedBy.length ? `${open} open` : undefined}
    >
      <ul className="flex flex-col gap-1">
        {blockedBy.map((dep) => (
          <li key={dep.id} className="group flex items-center gap-2 text-sm">
            <Link
              href={taskHref(dep.number)}
              className={
                dep.open
                  ? "flex-1 hover:underline"
                  : "flex-1 text-muted-foreground line-through"
              }
            >
              <span className="text-muted-foreground">#{dep.number}</span>{" "}
              {dep.title}
            </Link>
            <Badge variant={dep.open ? "destructive" : "secondary"}>
              {dep.open ? "Open" : "Resolved"}
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remove blocker #${dep.number}`}
              onClick={() => run(() => removeDependencyAction(taskId, dep.id))}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
      <TaskPicker
        excludeIds={[taskId, ...blockedBy.map((d) => d.id)]}
        onPick={(task) => run(() => addDependencyAction(taskId, task.id))}
      />
    </Section>
  )
}
