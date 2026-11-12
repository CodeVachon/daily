// Server-Sent Events for live updates (motte #34). Driver-free so it can be
// tested with fakes; the route wires it to services.changes and activity.
import type { TaskChange } from "@workspace/db/core"

/** What the browser receives for one change. */
export type LiveChange = Omit<TaskChange, "userId">

/** One SSE message. `id` lets EventSource resume with Last-Event-ID. */
export function formatSse(change: LiveChange): string {
  return `id: ${change.seq}\nevent: change\ndata: ${JSON.stringify(change)}\n\n`
}

export interface EventStreamOptions {
  /** Start receiving changes; resolves to an unsubscribe function. */
  subscribe: (
    onChange: (change: LiveChange) => void
  ) => Promise<() => Promise<void>>
  /**
   * Start receiving calendar changes (no ids: the page just refreshes);
   * resolves to an unsubscribe function.
   */
  subscribeCalendar?: (onChange: () => void) => Promise<() => Promise<void>>
  /** Changes after a seq, for a reconnecting client (oldest first). */
  missedSince: (seq: number) => Promise<LiveChange[]>
  /** The Last-Event-ID the browser sent, if any. */
  lastEventId: string | null
  /** Aborts when the client disconnects. */
  signal: AbortSignal
  heartbeatMs?: number
}

/**
 * A text/event-stream of the user's task changes: missed ones first (on
 * reconnect), then live ones, with a comment line every `heartbeatMs` so
 * proxies keep the connection open. Each change is sent once.
 */
/** A calendar change: no id, so Last-Event-ID still tracks task events. */
export const CALENDAR_SSE = "event: calendar\ndata: {}\n\n"

export function eventStream({
  subscribe,
  subscribeCalendar = async () => async () => {},
  missedSince,
  lastEventId,
  signal,
  heartbeatMs = 25_000,
}: EventStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let lastSent = Number(lastEventId) || 0
  let cleanup = async () => {}

  return new ReadableStream({
    async start(controller) {
      const write = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          // The stream closed underneath us; the abort handler cleans up.
        }
      }
      const send = (change: LiveChange) => {
        if (change.seq <= lastSent) return
        lastSent = change.seq
        write(formatSse(change))
      }

      write("retry: 5000\n\n")
      // Subscribe before catching up, so nothing slips between the two.
      const unsubscribe = await subscribe(send)
      const unsubscribeCalendar = await subscribeCalendar(() =>
        write(CALENDAR_SSE)
      )
      if (lastSent > 0)
        for (const change of await missedSince(lastSent)) send(change)
      const heartbeat = setInterval(() => write(": ping\n\n"), heartbeatMs)

      cleanup = async () => {
        clearInterval(heartbeat)
        await Promise.all([unsubscribe(), unsubscribeCalendar()])
      }
      const close = async () => {
        await cleanup()
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      }
      if (signal.aborted) await close()
      else signal.addEventListener("abort", () => void close(), { once: true })
    },
    async cancel() {
      await cleanup()
    },
  })
}
