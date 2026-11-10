"use server"

import { services } from "@workspace/db"
import type { Priority } from "@workspace/db/core"
import { parseDue } from "@workspace/db/time"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

export interface TaskFormInput {
  title: string
  description: string
  status: string
  priority: Priority
  /** "2026-11-14", "2026-11-14T17:00" (user's zone) or null. */
  due: string | null
  projectId: string | null
  labelIds: string[]
}

const dueValue = async (userId: string, due: string | null | undefined) =>
  due === undefined || due === null
    ? due
    : parseDue(due, await services.settings.getTimezone(userId))

export async function createTaskAction(input: TaskFormInput) {
  return runAsUser(async (actor) => {
    const { labelIds, due, ...fields } = input
    const task = await services.tasks.create(actor, {
      ...fields,
      due: await dueValue(actor.userId, due),
    })
    if (labelIds.length)
      await services.labels.setForTask(actor, task.id, labelIds)
    refresh()
    return { number: task.number }
  })
}

export async function updateTaskAction(
  ref: string,
  patch: Partial<TaskFormInput>
) {
  return runAsUser(async (actor) => {
    const { labelIds, due, ...fields } = patch
    const task = await services.tasks.update(actor, ref, {
      ...fields,
      ...(due !== undefined ? { due: await dueValue(actor.userId, due) } : {}),
    })
    if (labelIds) await services.labels.setForTask(actor, task.id, labelIds)
    refresh()
    return { number: task.number }
  })
}

/** Get-or-create a label by name (from the label picker). */
export async function ensureLabelAction(name: string) {
  return runAsUser(async (actor) => {
    const [label] = await services.labels.ensure(actor, [name])
    return { id: label!.id, name: label!.name, color: label!.color }
  })
}
