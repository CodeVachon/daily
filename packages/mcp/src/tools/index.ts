import { activityTools } from "./activity"
import { catalogTools } from "./catalog"
import { collaborationTools } from "./collaboration"
import { integrationTools } from "./integrations"
import { linkTools } from "./links"
import { settingsTools } from "./settings"
import { systemTools } from "./system"
import { taskTools } from "./tasks"
import type { ToolModule } from "./types"
import { workflowModule } from "./workflows"

/**
 * Every MCP tool module. When you add an app feature, add its tools module
 * here too — see AGENTS.md ("Every feature ships MCP tools").
 */
export const toolModules: ToolModule[] = [
  systemTools,
  taskTools,
  collaborationTools,
  catalogTools,
  activityTools,
  settingsTools,
  integrationTools,
  linkTools,
  workflowModule,
]
