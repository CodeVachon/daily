// The worker's run loop, with its effects injected so it can be tested.

export interface WorkerDeps {
  /** One sync pass; null when another worker instance holds the lock. */
  pass: () => Promise<Record<string, number> | null>
  /** Record a heartbeat with what the pass did. */
  beat: (details: Record<string, number>) => Promise<void>
  sleep: (ms: number, signal: AbortSignal) => Promise<void>
  log: (message: string) => void
  intervalMs: number
}

/** Wait `ms`, or less if `signal` aborts first. Never rejects. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done)
  })
}

async function tick(deps: WorkerDeps) {
  try {
    const summary = await deps.pass()
    if (!summary) return deps.log("another worker is syncing; skipped")
    await deps.beat(summary)
    if (summary.checked)
      deps.log(
        `synced ${summary.checked} link(s), ${summary.failed ?? 0} failed`
      )
  } catch (error) {
    // Keep going: a database blip shouldn't stop the worker for good.
    deps.log(
      `sync pass failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/** Run passes every `intervalMs` until `signal` aborts (SIGTERM). */
export async function runWorker(deps: WorkerDeps, signal: AbortSignal) {
  deps.log(`sync worker started; every ${deps.intervalMs / 1000}s`)
  while (!signal.aborted) {
    await tick(deps)
    await deps.sleep(deps.intervalMs, signal)
  }
  deps.log("sync worker stopped")
}
