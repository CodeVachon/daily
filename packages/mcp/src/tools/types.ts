import type { McpServer } from "@modelcontextprotocol/server"

import type { McpContext } from "../context"

/**
 * A group of related MCP tools. Each app feature ships one of these next to
 * its data access code and is listed in `src/tools/index.ts`.
 */
export type ToolModule = (server: McpServer, ctx: McpContext) => void

/** Tool result carrying both a JSON text block and structured content. */
export function json<T extends Record<string, unknown>>(data: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  }
}
