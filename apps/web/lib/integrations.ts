import "server-only"

import { services } from "@workspace/db"
import {
  createIntegrations,
  googleConfig,
  type Integrations,
} from "@workspace/integrations"

import { ENV } from "@/env"

/** GitHub/Jira/Google connections for server components and actions. */
export const integrations: Integrations = createIntegrations({
  services,
  google: googleConfig(ENV),
})
