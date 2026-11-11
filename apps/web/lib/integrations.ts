import "server-only"

import { services } from "@workspace/db"
import { createIntegrations, googleConfig } from "@workspace/integrations"

import { ENV } from "@/env"

/** GitHub/Jira/Google connections for server components and actions. */
export const integrations = createIntegrations({
  services,
  google: googleConfig(ENV),
})
