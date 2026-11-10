"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { UnlinkIcon } from "lucide-react"
import Link from "next/link"

import {
  addSubtaskAction,
  detachSubtaskAction,
} from "@/app/(app)/tasks/collaboration-actions"
import { taskHref } from "@/lib/task-form"

import { AddInput } from "./add-input"
import { Section } from "./section"
import { useAction } from "./use-action"

export interface SubtaskView {
  id: string
  number: number
  title: string
  status: { name: string; category: string }
}

export function SubtasksSection({
  taskId,
  subtasks,
}: {
  taskId: string
  subtasks: SubtaskView[]
}) {
  const { pending, run } = useAction()
  return (
    <Section title="Subtasks" aside={subtasks.length || undefined}>
      <ul className="flex flex-col gap-1">
        {subtasks.map((sub) => (
          <li key={sub.id} className="group flex items-center gap-2 text-sm">
            <Link
              href={taskHref(sub.number)}
              className={
                sub.status.category === "done"
                  ? "flex-1 text-muted-foreground line-through"
                  : "flex-1 hover:underline"
              }
            >
              <span className="text-muted-foreground">#{sub.number}</span>{" "}
              {sub.title}
            </Link>
            <Badge variant="outline">{sub.status.name}</Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Detach #${sub.number}`}
              onClick={() => run(() => detachSubtaskAction(sub.id))}
            >
              <UnlinkIcon />
            </Button>
          </li>
        ))}
      </ul>
      <AddInput
        placeholder="Add a subtask"
        disabled={pending}
        onAdd={(title) => run(() => addSubtaskAction(taskId, title))}
      />
    </Section>
  )
}
