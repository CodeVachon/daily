import { systemTools } from "./system"
import { taskTools } from "./tasks"
import type { ToolModule } from "./types"

/**
 * Every MCP tool module. When you add an app feature, add its tools module
 * here too — see AGENTS.md ("Every feature ships MCP tools").
 */
export const toolModules: ToolModule[] = [systemTools, taskTools]
