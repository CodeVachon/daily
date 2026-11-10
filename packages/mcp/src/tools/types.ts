import type { McpServer } from "@modelcontextprotocol/server"
import { ForbiddenError, NotFoundError, ValidationError } from "@workspace/db/core"
import { z } from "zod"

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

/** A tool-level error the agent can read and act on (not a protocol error). */
function toolError(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] }
}

const EXPECTED_ERRORS = [
  NotFoundError,
  ValidationError,
  ForbiddenError,
  RangeError,
]

function describe(error: unknown): string | null {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ")
  }
  if (EXPECTED_ERRORS.some((type) => error instanceof type))
    return (error as Error).message
  return null
}

/**
 * Run a tool body; expected failures (not found, invalid input, not allowed)
 * become readable tool errors instead of protocol errors. Anything else is a
 * bug and is rethrown.
 */
export async function safely<T>(
  run: () => Promise<T>
): Promise<T | ReturnType<typeof toolError>> {
  try {
    return await run()
  } catch (error) {
    const message = describe(error)
    if (message === null) throw error
    return toolError(message)
  }
}
