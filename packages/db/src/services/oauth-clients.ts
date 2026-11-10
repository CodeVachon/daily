import { eq } from "drizzle-orm"

import type { Database } from "../database"
import { oauthClient } from "../schema"

export interface OAuthClientDisplay {
  name: string | null
  uri: string | null
}

export function createOAuthClientService(db: Database) {
  return {
    /** What the consent screen shows about a client. Null if unknown. */
    async getDisplayInfo(clientId: string): Promise<OAuthClientDisplay | null> {
      const row = await db.query.oauthClient.findFirst({
        where: eq(oauthClient.clientId, clientId),
        columns: { name: true, uri: true },
      })
      return row ?? null
    },

    /** Removes a registered client and (by cascade) its tokens and consents. */
    async delete(clientId: string): Promise<void> {
      await db.delete(oauthClient).where(eq(oauthClient.clientId, clientId))
    },
  }
}
