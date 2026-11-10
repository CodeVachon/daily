/**
 * Who made a change. Every write service takes an Actor, so history can say
 * "you", "Claude Code" (an agent acting for you) or "sync" (the system).
 */
export type ActorType = "user" | "agent" | "system"

/** Background processes that write data on the user's behalf. */
export type SystemActorName = "sync" | "standup"

export interface Actor {
  type: ActorType
  /** The user whose data this is (agents and system act *for* a user). */
  userId: string
  /** OAuth client id for agents; null otherwise. */
  clientId: string | null
  /** Display name: the user's name, the agent's client name, or the system job. */
  label: string
}

export function userActor(user: { id: string; name: string }): Actor {
  return { type: "user", userId: user.id, clientId: null, label: user.name }
}

export function agentActor(
  userId: string,
  clientId: string,
  clientName?: string | null
): Actor {
  return {
    type: "agent",
    userId,
    clientId,
    label: clientName?.trim() || clientId,
  }
}

export function systemActor(userId: string, name: SystemActorName): Actor {
  return { type: "system", userId, clientId: null, label: name }
}

/** A service refused the operation for this actor. Not retryable. */
export class ForbiddenError extends Error {
  readonly actor: Actor

  constructor(message: string, actor: Actor) {
    super(message)
    this.name = "ForbiddenError"
    this.actor = actor
  }
}

/** Throws unless the change is made by the user themselves. */
function assertIsUser(actor: Actor, action: string): void {
  if (actor.type !== "user") {
    throw new ForbiddenError(
      `${actor.label} (${actor.type}) cannot ${action}; only the user can.`,
      actor
    )
  }
}

/**
 * Deletion policy: only the user may delete or remove data (always a soft
 * delete). Agents and system jobs never can. Every delete/remove service
 * method calls this first.
 */
export function assertCanDelete(actor: Actor, what = "data"): void {
  assertIsUser(actor, `delete ${what}`)
}

/** Restoring from the Trash is also the user's call alone. */
export function assertCanRestore(actor: Actor, what = "data"): void {
  assertIsUser(actor, `restore ${what}`)
}
