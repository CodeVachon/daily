import type { Database } from "../database"
import { createActorService } from "./actors"
import { createOAuthClientService } from "./oauth-clients"
import { createUserService } from "./users"

/**
 * Every data-access service. This is the single source of truth for data:
 * nothing outside packages/db may query the database.
 */
export function createServices(db: Database) {
  return {
    actors: createActorService(db),
    users: createUserService(db),
    oauthClients: createOAuthClientService(db),
  }
}

export type Services = ReturnType<typeof createServices>
export type { UserProfile } from "./users"
export type { OAuthClientDisplay } from "./oauth-clients"
