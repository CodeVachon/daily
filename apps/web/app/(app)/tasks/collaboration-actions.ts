"use server"

import { services } from "@workspace/db"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

/** Run a change as the user, then refresh the page. */
const change = <T>(mutation: Parameters<typeof runAsUser<T>>[0]) =>
  runAsUser(async (actor) => {
    const result = await mutation(actor)
    refresh()
    return result
  })

export async function addChecklistItemAction(taskId: string, text: string) {
  return change((actor) =>
    services.checklist.add(actor, taskId, text).then(() => null)
  )
}

export async function toggleChecklistItemAction(itemId: string, done: boolean) {
  return change((actor) =>
    services.checklist.toggle(actor, itemId, done).then(() => null)
  )
}

export async function removeChecklistItemAction(itemId: string) {
  return change((actor) =>
    services.checklist.remove(actor, itemId).then(() => null)
  )
}

export async function addSubtaskAction(parentTaskId: string, title: string) {
  return change((actor) =>
    services.tasks
      .create(actor, { title, parentTaskId })
      .then((t) => ({ number: t.number }))
  )
}

export async function detachSubtaskAction(subtaskId: string) {
  return change((actor) =>
    services.tasks.setParent(actor, subtaskId, null).then(() => null)
  )
}

export async function addDependencyAction(
  taskId: string,
  blockedByTaskId: string
) {
  return change((actor) =>
    services.dependencies.add(actor, taskId, blockedByTaskId).then(() => null)
  )
}

export async function removeDependencyAction(
  taskId: string,
  blockedByTaskId: string
) {
  return change((actor) =>
    services.dependencies
      .remove(actor, taskId, blockedByTaskId)
      .then(() => null)
  )
}

export async function addCommentAction(taskId: string, body: string) {
  return change((actor) =>
    services.comments.add(actor, taskId, body).then(() => null)
  )
}

export async function editCommentAction(commentId: string, body: string) {
  return change((actor) =>
    services.comments.edit(actor, commentId, body).then(() => null)
  )
}

export async function deleteCommentAction(commentId: string) {
  return change((actor) =>
    services.comments.softDelete(actor, commentId).then(() => null)
  )
}

/** Task search for pickers (e.g. "blocked by"). */
export async function searchTasksAction(query: string) {
  return runAsUser(async (actor) => {
    const { tasks } = await services.tasks.list(actor.userId, {
      text: query,
      orderBy: "updated",
      limit: 10,
    })
    return tasks.map((t) => ({ id: t.id, number: t.number, title: t.title }))
  })
}
