// Integration providers and their stored shapes (motte #37). Database-free.
import { z } from "zod"

/** External systems the user can connect with their own credentials. */
export const INTEGRATION_PROVIDERS = ["github", "jira"] as const
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

/** A repository (GitHub) or project (Jira) the user has put in scope. */
export const integrationResource = z.object({
  /** The provider's stable id (GitHub repo id, Jira project id). */
  externalId: z.string().min(1),
  /** What people type: "owner/repo", "PROJ". */
  key: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
})
export type IntegrationResource = z.infer<typeof integrationResource>
