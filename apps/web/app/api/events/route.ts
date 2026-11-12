import { auth } from "@workspace/auth"
import { services } from "@workspace/db"

import { eventStream, type LiveChange } from "@/lib/event-stream"

export const dynamic = "force-dynamic"

/** Most changes replayed to a reconnecting tab (it only needs to refresh). */
const MAX_REPLAY = 50

/**
 * `GET /api/events`: the signed-in user's task changes as Server-Sent Events,
 * from every source (this app, MCP agents, the sync worker). The browser's
 * EventSource reconnects with Last-Event-ID and gets what it missed.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response("Unauthorized", { status: 401 })
  const userId = session.user.id

  const stream = eventStream({
    subscribe: (onChange) =>
      services.changes.subscribe(userId, ({ userId: _, ...change }) =>
        onChange(change)
      ),
    subscribeCalendar: (onChange) =>
      services.calendarChanges.subscribe(userId, () => onChange()),
    missedSince: async (seq): Promise<LiveChange[]> => {
      const { events } = await services.activity.since(userId, {
        after: seq,
        limit: MAX_REPLAY,
      })
      return events.map((e) => ({
        seq: e.seq,
        taskId: e.taskId,
        actorType: e.actor.type,
        clientId: e.actor.clientId,
      }))
    },
    lastEventId: request.headers.get("last-event-id"),
    signal: request.signal,
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      // Don't let a reverse proxy (Caddy, nginx) buffer the stream.
      "x-accel-buffering": "no",
    },
  })
}
