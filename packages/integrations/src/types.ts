import type {
  IntegrationProvider,
  IntegrationResource,
} from "@workspace/db/core"
import type { z } from "zod"

/** `fetch`, injectable so tests never touch the network. */
export type Fetch = typeof fetch

/** One input on a provider's credentials form. */
export interface CredentialField {
  name: string
  label: string
  type: "text" | "password" | "email"
  placeholder?: string
  description?: string
}

/** What the UI needs to show a provider. Serializable (no functions). */
export interface ProviderInfo {
  id: IntegrationProvider
  name: string
  /** What gets put in scope: "repository" / "project". */
  resourceNoun: { one: string; many: string }
  fields: CredentialField[]
  /** Where and how to create the credentials. */
  help: { text: string; url: string }
}

/** A repository/project the credentials can see, before it's selected. */
export interface AvailableResource extends IntegrationResource {
  description: string | null
  private: boolean
}

/** Verified identity, stored for display (never secret). */
export interface Verified {
  account: string
  config: Record<string, string>
}

export interface Provider<C = unknown> extends ProviderInfo {
  credentials: z.ZodType<C, unknown>
  /** Check the credentials work; who they belong to. */
  verify(credentials: C, fetch: Fetch): Promise<Verified>
  /** Everything the credentials can see, for the user to choose from. */
  listResources(credentials: C, fetch: Fetch): Promise<AvailableResource[]>
}
