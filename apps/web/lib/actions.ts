import "server-only"

import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  userActor,
  type Actor,
} from "@workspace/db/core"
import { z } from "zod"

import { requireSession } from "@/lib/session"

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string }

const EXPECTED = [ForbiddenError, NotFoundError, ValidationError, RangeError]

/** A message for errors users can act on; null for bugs (which are rethrown). */
export function describeActionError(error: unknown): string | null {
  if (error instanceof z.ZodError)
    return error.issues.map((issue) => issue.message).join("; ")
  if (EXPECTED.some((type) => error instanceof type))
    return (error as Error).message
  return null
}

/**
 * Run a mutation as the signed-in user. Expected failures become
 * `{ ok: false, error }` for the UI; unexpected ones still throw.
 */
export async function runAsUser<T>(
  mutation: (actor: Actor) => Promise<T>
): Promise<ActionResult<T>> {
  const { user } = await requireSession()
  try {
    return { ok: true, data: await mutation(userActor(user)) }
  } catch (error) {
    const message = describeActionError(error)
    if (message === null) throw error
    return { ok: false, error: message }
  }
}
