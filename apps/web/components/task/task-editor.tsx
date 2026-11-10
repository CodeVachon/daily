"use client"

import type { TaskDetail } from "@workspace/db/core"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useState } from "react"
import { toast } from "sonner"

import { updateTaskAction, type TaskFormInput } from "@/app/(app)/tasks/actions"
import { dueFromForm, dueToForm } from "@/lib/task-form"
import type { TaskOptions } from "@/lib/task-options"

import { DescriptionEditor } from "./description-editor"
import {
  DuePicker,
  LabelPicker,
  PrioritySelect,
  ProjectSelect,
  StatusSelect,
} from "./fields"

/** Inline editing for one task: every change saves immediately. */
export function TaskEditor({
  task,
  options,
}: {
  task: TaskDetail
  options: TaskOptions
}) {
  const [title, setTitle] = useState(task.title)
  const [due, setDue] = useState(() => dueToForm(task.due, options.timezone))

  async function save(patch: Partial<TaskFormInput>): Promise<boolean> {
    const result = await updateTaskAction(String(task.number), patch)
    if (!result.ok) toast.error(result.error)
    return result.ok
  }

  async function saveTitle() {
    if (title.trim() === task.title) return
    if (!(await save({ title }))) setTitle(task.title)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Input
          aria-label="Title"
          className="h-auto border-transparent px-2 py-1 font-heading text-2xl shadow-none hover:border-input md:text-2xl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <DescriptionEditor
          value={task.description}
          onSave={(description) => save({ description })}
        />
      </div>
      <aside>
        <FieldGroup>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <StatusSelect
              value={task.status.key}
              onChange={(status) => save({ status })}
              statuses={options.statuses}
            />
          </Field>
          <Field>
            <FieldLabel>Priority</FieldLabel>
            <PrioritySelect
              value={task.priority}
              onChange={(priority) => save({ priority })}
            />
          </Field>
          <Field>
            <FieldLabel>Due</FieldLabel>
            <DuePicker
              value={due}
              onChange={(next) => {
                setDue(next)
                // Save once the date is set or cleared (time edits save as they change).
                void save({ due: dueFromForm(next) })
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Project</FieldLabel>
            <ProjectSelect
              value={task.project?.id ?? null}
              onChange={(projectId) => save({ projectId })}
              projects={options.projects}
            />
          </Field>
          <Field>
            <FieldLabel>Labels</FieldLabel>
            <LabelPicker
              value={task.labels.map((l) => l.id)}
              onChange={(labelIds) => save({ labelIds })}
              labels={options.labels}
            />
          </Field>
        </FieldGroup>
      </aside>
    </div>
  )
}
