import { services } from "@workspace/db"

import { CatalogManager } from "@/components/catalog-manager"
import { requireSession } from "@/lib/session"

import {
  createLabelAction,
  deleteLabelAction,
  updateLabelAction,
} from "../../catalog-actions"

export const metadata = { title: "Labels · Settings · Daily" }

export default async function LabelsPage() {
  const { user } = await requireSession()
  const labels = await services.labels.list(user.id)
  return (
    <CatalogManager
      noun="label"
      items={labels}
      actions={{
        create: createLabelAction,
        update: updateLabelAction,
        remove: deleteLabelAction,
      }}
    />
  )
}
