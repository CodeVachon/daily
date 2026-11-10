import { services } from "@workspace/db"

import { CatalogManager } from "@/components/catalog-manager"
import { PageHeader } from "@/components/page-header"
import { requireSession } from "@/lib/session"

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "../catalog-actions"

export const metadata = { title: "Projects · Daily" }

export default async function ProjectsPage() {
  const { user } = await requireSession()
  const projects = await services.projects.list(user.id, {
    includeArchived: true,
  })
  return (
    <>
      <PageHeader title="Projects" />
      <CatalogManager
        noun="project"
        items={projects}
        actions={{
          create: createProjectAction,
          update: updateProjectAction,
          remove: deleteProjectAction,
        }}
      />
    </>
  )
}
