import { db } from "./client"
import { createServices } from "./services"

/** App-wide services bound to the real database. */
export const services = createServices(db)

export { authDatabaseAdapter } from "./auth-adapter"
export type { Services, UserProfile, OAuthClientDisplay } from "./services"
export {
  agentActor,
  assertCanDelete,
  ForbiddenError,
  systemActor,
  userActor,
  type Actor,
  type ActorType,
  type SystemActorName,
} from "./actor"
