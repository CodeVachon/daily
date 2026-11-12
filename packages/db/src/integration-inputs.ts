// Integration providers and their stored shapes (motte #37). Database-free.
import { z } from "zod"

/** Systems whose issues/PRs tasks can link to (credentials pasted by the user). */
export const LINK_PROVIDERS = ["github", "jira"] as const
export type LinkProvider = (typeof LINK_PROVIDERS)[number]

/** External systems the user can connect: link providers plus Google (OAuth). */
export const INTEGRATION_PROVIDERS = [...LINK_PROVIDERS, "google"] as const
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

/** A repository (GitHub), project (Jira) or calendar (Google) in scope. */
export const integrationResource = z.object({
  /** The provider's stable id (repo id, project id, calendar id). */
  externalId: z.string().min(1),
  /** What people type: "owner/repo", "PROJ". */
  key: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
})
export type IntegrationResource = z.infer<typeof integrationResource>
