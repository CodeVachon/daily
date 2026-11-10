import type { Database } from "../database"
import { createActivityService } from "./activity"
import { createActorService } from "./actors"
import { createLabelService } from "./labels"
import { createOAuthClientService } from "./oauth-clients"
import { createProjectService } from "./projects"
import { createSettingsService } from "./settings"
import { createTaskService } from "./tasks"
import { createUserService } from "./users"

/**
 * Every data-access service. This is the single source of truth for data:
 * nothing outside packages/db may query the database.
 */
export function createServices(db: Database) {
  return {
    activity: createActivityService(db),
    actors: createActorService(db),
    users: createUserService(db),
    labels: createLabelService(db),
    oauthClients: createOAuthClientService(db),
    projects: createProjectService(db),
    settings: createSettingsService(db),
    tasks: createTaskService(db),
  }
}

export type Services = ReturnType<typeof createServices>
export type { UserProfile } from "./users"
export type { OAuthClientDisplay } from "./oauth-clients"
export type { TimezoneUpdate } from "./settings"
