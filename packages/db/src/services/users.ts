import { eq } from "drizzle-orm"

import type { Database } from "../database"
import { user } from "../schema"

export interface UserProfile {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: Date
  /** GitHub numeric account id, when the user signed in with GitHub. */
  githubAccountId: string | null
}

export function createUserService(db: Database) {
  return {
    /** Profile for `whoami`-style views. Null if the user no longer exists. */
    async getProfile(userId: string): Promise<UserProfile | null> {
      const row = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: { accounts: { columns: { providerId: true, accountId: true } } },
      })
      if (!row) return null
      const { accounts, emailVerified: _, updatedAt: __, ...profile } = row
      const github = accounts.find((a) => a.providerId === "github")
      return { ...profile, githubAccountId: github?.accountId ?? null }
    },

    /** Deletes a user; sessions, accounts and OAuth grants cascade. */
    async delete(userId: string): Promise<void> {
      await db.delete(user).where(eq(user.id, userId))
    },
  }
}
