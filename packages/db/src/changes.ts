// Live change feed (motte #33). Database-free: the LISTEN connection is
// injected (postgres-js in the app, PGlite in tests).
import type { ActorType } from "./actor"

/** Postgres channel the task_event trigger notifies (migration 0013). */
const CHANGES_CHANNEL = "task_events"

/** Notified when a user's cached calendar events change (calendar sync). */
export const CALENDAR_CHANNEL = "calendar_changes"

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

/** Some of a user's calendar events changed (no details: refetch). */
export interface CalendarChange {
  userId: string
}

function parseJson<T extends { userId: string }>(
  payload: string,
  valid: (value: T) => boolean
): T | null {
  try {
    const value = JSON.parse(payload) as T
    return typeof value.userId === "string" && valid(value) ? value : null
  } catch {
    return null
  }
}

/**
 * Fans one LISTEN connection out to per-user subscribers. Listens while
 * anyone is subscribed and stops when the last one leaves.
 */
function createFeed<T extends { userId: string }>(
  listen: Listen,
  channel: string,
  parse: (payload: string) => T | null
) {
  type Handler = (change: T) => void
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
    listening ??= listen(channel, dispatch)
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
     * Call `handler` with each of `userId`'s changes, from any process.
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

/** Every task event, as it commits. */
export const createChangeFeed = (listen: Listen) =>
  createFeed<TaskChange>(listen, CHANGES_CHANNEL, (payload) =>
    parseJson<TaskChange>(payload, (c) => typeof c.seq === "number")
  )

/** Calendar syncs that changed something. */
export const createCalendarFeed = (listen: Listen) =>
  createFeed<CalendarChange>(listen, CALENDAR_CHANNEL, (payload) =>
    parseJson<CalendarChange>(payload, () => true)
  )

export type ChangeFeed = ReturnType<typeof createChangeFeed>
