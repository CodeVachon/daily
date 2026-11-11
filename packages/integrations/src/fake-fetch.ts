// Test-only: a fetch that answers from a table instead of the network.
import type { Fetch } from "./types"

type Reply = { status?: number; body?: unknown } | Error

/** Routes are matched by URL prefix, longest first; calls are recorded. */
export function fakeFetch(routes: Record<string, Reply>) {
  const calls: {
    url: string
    method: string
    headers: Record<string, string>
    body: string | null
  }[] = []
  const prefixes = Object.keys(routes).sort((a, b) => b.length - a.length)
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === "string" ? init.body : null,
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
