import { describe, expect, it, vi } from "vitest"

import { runWorker, sleep, type WorkerDeps } from "./loop"

function harness(passes: (Record<string, number> | null | Error)[]) {
  const controller = new AbortController()
  const logs: string[] = []
  const beats: Record<string, number>[] = []
  const deps: WorkerDeps = {
    intervalMs: 60_000,
    pass: async () => {
      const next = passes.shift()
      if (passes.length === 0) controller.abort()
      if (next instanceof Error) throw next
      return next ?? null
    },
    beat: async (details) => {
      beats.push(details)
    },
    sleep: async () => {},
    log: (m) => logs.push(m),
  }
  return { deps, signal: controller.signal, logs, beats }
}

describe("runWorker", () => {
  it("passes, beats and logs until stopped", async () => {
    const h = harness([
      { checked: 2, failed: 1 },
      { checked: 0, failed: 0 },
    ])
    await runWorker(h.deps, h.signal)
    expect(h.beats).toEqual([
      { checked: 2, failed: 1 },
      { checked: 0, failed: 0 },
    ])
    expect(h.logs).toEqual([
      "sync worker started; every 60s",
      "synced 2 link(s), 1 failed",
      "sync worker stopped",
    ])
  })

  it("skips the beat when another worker holds the lock", async () => {
    const h = harness([null])
    await runWorker(h.deps, h.signal)
    expect(h.beats).toEqual([])
    expect(h.logs).toContain("another worker is syncing; skipped")
  })

  it("survives a failed pass", async () => {
    const h = harness([new Error("connection refused"), { checked: 1 }])
    await runWorker(h.deps, h.signal)
    expect(h.logs).toContain("sync pass failed: connection refused")
    expect(h.logs).toContain("synced 1 link(s), 0 failed")
  })
})

describe("sleep", () => {
  it("ends early when aborted", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const done = vi.fn()
    void sleep(60_000, controller.signal).then(done)
    controller.abort()
    await vi.runAllTimersAsync()
    expect(done).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("resolves after the delay, or at once if already aborted", async () => {
    vi.useFakeTimers()
    const done = vi.fn()
    void sleep(1000, new AbortController().signal).then(done)
    await vi.advanceTimersByTimeAsync(1000)
    expect(done).toHaveBeenCalled()
    vi.useRealTimers()
    await expect(sleep(10, AbortSignal.abort())).resolves.toBeUndefined()
  })
})
