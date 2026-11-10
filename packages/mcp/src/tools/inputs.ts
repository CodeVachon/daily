import { z } from "zod"

/** "#12", "12", 12 or a task id. */
export const taskRef = z
  .union([z.string().min(1), z.number().int().positive()])
  .describe('Task number ("#12" or 12) or id')
