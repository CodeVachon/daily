import type { Database } from "../database"
import { createActivityService } from "./activity"
import { createActorService } from "./actors"
import { createOAuthClientService } from "./oauth-clients"
import { createSettingsService } from "./settings"
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
    oauthClients: createOAuthClientService(db),
    settings: createSettingsService(db),
  }
}

export type Services = ReturnType<typeof createServices>
export type { UserProfile } from "./users"
export type { OAuthClientDisplay } from "./oauth-clients"
export type { TimezoneUpdate } from "./settings"
