// Test-only: a fetch that answers from a table instead of the network.
import type { Fetch } from "./types"

type Reply = { status?: number; body?: unknown } | Error

/** Routes are matched by URL prefix, longest first; calls are recorded. */
export function fakeFetch(routes: Record<string, Reply>) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const prefixes = Object.keys(routes).sort((a, b) => b.length - a.length)
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({
      url,
      headers: (init?.headers ?? {}) as Record<string, string>,
    })
    const match = prefixes.find((prefix) => url.startsWith(prefix))
    const reply = match ? routes[match]! : { status: 404, body: {} }
    if (reply instanceof Error) throw reply
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    })
  }) as Fetch
  return { fetch, calls }
}
