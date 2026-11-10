// Live change feed (motte #33). Database-free: the LISTEN connection is
// injected (postgres-js in the app, PGlite in tests).
import type { ActorType } from "./actor"

/** Postgres channel the task_event trigger notifies (migration 0013). */
const CHANGES_CHANNEL = "task_events"

/** One task event, announced as soon as its transaction commits. Ids only. */
export interface TaskChange {
  /** The event's cursor: fetch details with activity.since({ after: seq - 1 }). */
  seq: number
  userId: string
  taskId: string
  actorType: ActorType
  /** The agent's OAuth client; null for users and the system. */
  clientId: string | null
}

/** Start listening on a channel; resolves to a function that stops. */
export type Listen = (
  channel: string,
  onPayload: (payload: string) => void
) => Promise<() => Promise<void>>

type Handler = (change: TaskChange) => void

function parse(payload: string): TaskChange | null {
  try {
    const change = JSON.parse(payload) as TaskChange
    return typeof change.userId === "string" && typeof change.seq === "number"
      ? change
      : null
  } catch {
    return null
  }
}

/**
 * Fans one LISTEN connection out to per-user subscribers. Listens while
 * anyone is subscribed and stops when the last one leaves.
 */
export function createChangeFeed(listen: Listen) {
  const handlers = new Map<string, Set<Handler>>()
  let listening: Promise<() => Promise<void>> | null = null

  const count = () =>
    [...handlers.values()].reduce((total, set) => total + set.size, 0)

  function dispatch(payload: string) {
    const change = parse(payload)
    if (!change) return
    for (const handler of handlers.get(change.userId) ?? []) handler(change)
  }

  async function start() {
    listening ??= listen(CHANGES_CHANNEL, dispatch)
    try {
      await listening
    } catch (error) {
      listening = null
      throw error
    }
  }

  async function stopIfIdle() {
    if (count() > 0 || !listening) return
    const stop = await listening
    listening = null
    await stop()
  }

  return {
    /**
     * Call `handler` with each of `userId`'s task changes, from any process.
     * Resolves once listening; the result unsubscribes.
     */
    async subscribe(
      userId: string,
      handler: Handler
    ): Promise<() => Promise<void>> {
      const set = handlers.get(userId) ?? new Set<Handler>()
      handlers.set(userId, set.add(handler))
      try {
        await start()
      } catch (error) {
        set.delete(handler)
        throw error
      }
      return async () => {
        set.delete(handler)
        if (set.size === 0) handlers.delete(userId)
        await stopIfIdle()
      }
    },
  }
}

export type ChangeFeed = ReturnType<typeof createChangeFeed>
