import { type Actor, agentActor } from "../actor"
import type { Database } from "../database"
import { createOAuthClientService } from "./oauth-clients"

export function createActorService(db: Database) {
  const oauthClients = createOAuthClientService(db)
  return {
    /**
     * The agent actor for an MCP request: named after the OAuth client
     * (e.g. "Claude Code"), falling back to the client id when the client is
     * unknown or unnamed.
     */
    async forAgent(userId: string, clientId: string): Promise<Actor> {
      const client = await oauthClients.getDisplayInfo(clientId)
      return agentActor(userId, clientId, client?.name)
    },
  }
}
