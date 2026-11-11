import { ValidationError } from "@workspace/db/core"

import type { Fetch } from "./types"

/**
 * A provider refused or couldn't be reached. A ValidationError, so the UI and
 * MCP tools show the message instead of treating it as a bug.
 */
export class ProviderError extends ValidationError {
  constructor(
    message: string,
    /** The provider's HTTP status, when it answered. */
    readonly status: number | null = null
  ) {
    super(message)
    this.name = "ProviderError"
  }
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string
      errorMessages?: string[]
      /** Google's shape. */
      error?: { message?: string }
    }
    return (
      body.message ??
      body.error?.message ??
      body.errorMessages?.join("; ") ??
      ""
    )
  } catch {
    return ""
  }
}

/** GET JSON from a provider; every failure becomes a readable ProviderError. */
export function getJson<T>(
  fetch: Fetch,
  provider: string,
  url: string,
  headers: Record<string, string>
): Promise<T> {
  return requestJson<T>(fetch, provider, url, { headers })
}

/** Send JSON (PATCH, POST) to a provider; failures as for getJson. */
export function sendJson<T>(
  fetch: Fetch,
  provider: string,
  url: string,
  {
    method,
    headers,
    body,
  }: {
    method: "PATCH" | "POST"
    headers: Record<string, string>
    body: unknown
  }
): Promise<T> {
  return requestJson<T>(fetch, provider, url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

async function requestJson<T>(
  fetch: Fetch,
  provider: string,
  url: string,
  init: { method?: string; headers: Record<string, string>; body?: string }
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new ProviderError(`Couldn't reach ${provider}. Try again shortly.`)
  }
  if (response.ok) return (await response.json()) as T
  if (response.status === 401 || response.status === 403)
    throw new ProviderError(
      `${provider} rejected the credentials (${response.status}). Check them, or create new ones.`,
      response.status
    )
  if (response.status === 404)
    throw new ProviderError(
      `${provider} returned 404 (not found). Check the address and that the account can see it.`,
      404
    )
  const detail = await errorDetail(response)
  throw new ProviderError(
    `${provider} returned ${response.status}${detail ? `: ${detail}` : ""}`,
    response.status
  )
}
