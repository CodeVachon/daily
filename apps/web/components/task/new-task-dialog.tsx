"use client"

import type { Priority } from "@workspace/db/core"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createTaskAction } from "@/app/(app)/tasks/actions"
import { dueFromForm, EMPTY_DUE, taskHref } from "@/lib/task-form"
import type { TaskOptions } from "@/lib/task-options"

import {
  DuePicker,
  LabelPicker,
  PrioritySelect,
  ProjectSelect,
  StatusSelect,
} from "./fields"

const initial = (status: string) => ({
  title: "",
  description: "",
  status,
  priority: "none" as Priority,
  due: EMPTY_DUE,
  projectId: null as string | null,
  labelIds: [] as string[],
})

export function NewTaskDialog({
  options,
  defaultStatus = "todo",
}: {
  options: TaskOptions
  defaultStatus?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => initial(defaultStatus))
  const [pending, startTransition] = useTransition()
  const set =
    <K extends keyof typeof form>(key: K) =>
    (value: (typeof form)[K]) =>
      setForm((f) => ({ ...f, [key]: value }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createTaskAction({
        ...form,
        due: dueFromForm(form.due),
      })
      if (!result.ok) return void toast.error(result.error)
      toast.success(`Created #${result.data.number}`, {
        action: {
          label: "Open",
          onClick: () => router.push(taskHref(result.data.number)),
        },
      })
      setForm(initial(defaultStatus))
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        New task
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Add it to your board. You can fill in details later.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-task-title">Title</FieldLabel>
              <Input
                id="new-task-title"
                autoFocus
                required
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="What needs doing?"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-task-description">
                Description
              </FieldLabel>
              <Textarea
                id="new-task-description"
                rows={4}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="Markdown supported"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <StatusSelect
                  value={form.status}
                  onChange={set("status")}
                  statuses={options.statuses}
                />
              </Field>
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <PrioritySelect
                  value={form.priority}
                  onChange={set("priority")}
                />
              </Field>
              <Field>
                <FieldLabel>Due</FieldLabel>
                <DuePicker value={form.due} onChange={set("due")} />
              </Field>
              <Field>
                <FieldLabel>Project</FieldLabel>
                <ProjectSelect
                  value={form.projectId}
                  onChange={set("projectId")}
                  projects={options.projects}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Labels</FieldLabel>
              <LabelPicker
                value={form.labelIds}
                onChange={set("labelIds")}
                labels={options.labels}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending || !form.title.trim()}>
              {pending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
