"use server"

import { services } from "@workspace/db"
import type { COLORS } from "@workspace/db/core"
import { refresh } from "next/cache"

import { runAsUser } from "@/lib/actions"

type Color = (typeof COLORS)[number] | null

export interface CatalogPatch {
  name?: string
  color?: Color
  archived?: boolean
}

const done = () => {
  refresh()
  return null
}

export async function createProjectAction(name: string, color: Color) {
  return runAsUser((actor) =>
    services.projects.create(actor, { name, color }).then(done)
  )
}

export async function updateProjectAction(id: string, patch: CatalogPatch) {
  return runAsUser((actor) =>
    services.projects.update(actor, id, patch).then(done)
  )
}

export async function deleteProjectAction(id: string) {
  return runAsUser((actor) =>
    services.projects.softDelete(actor, id).then(done)
  )
}

export async function createLabelAction(name: string, color: Color) {
  return runAsUser((actor) =>
    services.labels.create(actor, { name, color }).then(done)
  )
}

export async function updateLabelAction(
  id: string,
  { name, color }: CatalogPatch
) {
  return runAsUser((actor) =>
    services.labels.update(actor, id, { name, color }).then(done)
  )
}

export async function deleteLabelAction(id: string) {
  return runAsUser((actor) => services.labels.softDelete(actor, id).then(done))
}
