// The worker's run loop, with its effects injected so it can be tested.

/** One kind of work the worker repeats ("link-sync", "calendar-sync"). */
export interface WorkerJob {
  name: string
  /** One pass; null when another worker instance holds the lock. */
  run: () => Promise<Record<string, number> | null>
  /** What a pass did, for the log; null to stay quiet. */
  describe: (summary: Record<string, number>) => string | null
}

export interface WorkerDeps {
  /** Run in order on every tick; one failing doesn't stop the others. */
  jobs: WorkerJob[]
  /** Record a job's heartbeat with what its pass did. */
  beat: (job: string, details: Record<string, number>) => Promise<void>
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

async function runJob(deps: WorkerDeps, job: WorkerJob) {
  try {
    const summary = await job.run()
    if (!summary)
      return deps.log(`${job.name}: another worker is running it; skipped`)
    await deps.beat(job.name, summary)
    const line = job.describe(summary)
    if (line) deps.log(`${job.name}: ${line}`)
  } catch (error) {
    // Keep going: a database blip shouldn't stop the worker for good.
    deps.log(
      `${job.name} failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function tick(deps: WorkerDeps) {
  for (const job of deps.jobs) await runJob(deps, job)
}

/** Run passes every `intervalMs` until `signal` aborts (SIGTERM). */
export async function runWorker(deps: WorkerDeps, signal: AbortSignal) {
  const names = deps.jobs.map((j) => j.name).join(", ")
  deps.log(`sync worker started (${names}); every ${deps.intervalMs / 1000}s`)
  while (!signal.aborted) {
    await tick(deps)
    await deps.sleep(deps.intervalMs, signal)
  }
  deps.log("sync worker stopped")
}
