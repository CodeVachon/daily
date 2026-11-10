import "server-only"

import { services } from "@workspace/db"
import { createIntegrations } from "@workspace/integrations"

/** GitHub/Jira connections for server components and actions. */
export const integrations = createIntegrations({ services })
