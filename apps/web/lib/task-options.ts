import "server-only"

import { services } from "@workspace/db"

/** Everything the task forms offer as choices, plus the user's current zone. */
export async function loadTaskOptions(userId: string) {
  const [statuses, projects, labels, timezone] = await Promise.all([
    services.tasks.statuses(),
    services.projects.list(userId),
    services.labels.list(userId),
    services.settings.getTimezone(userId),
  ])
  return {
    statuses: statuses.map(({ key, name, category }) => ({
      key,
      name,
      category,
    })),
    projects: projects.map(({ id, name }) => ({ id, name })),
    labels: labels.map(({ id, name, color }) => ({ id, name, color })),
    timezone,
  }
}

export type TaskOptions = Awaited<ReturnType<typeof loadTaskOptions>>
