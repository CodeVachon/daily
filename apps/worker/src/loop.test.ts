import { describe, expect, it, vi } from "vitest"

import { runWorker, sleep, type WorkerDeps } from "./loop"

type Pass = Record<string, number> | null | Error

function harness(links: Pass[], calendars: Pass[] = []) {
  const controller = new AbortController()
  const logs: string[] = []
  const beats: [string, Record<string, number>][] = []
  const job = (name: string, passes: Pass[]) => ({
    name,
    run: async () => {
      const next = passes.shift()
      if (next instanceof Error) throw next
      return next ?? null
    },
    describe: (s: Record<string, number>) =>
      s.checked ? `did ${s.checked}` : null,
  })
  const deps: WorkerDeps = {
    intervalMs: 60_000,
    jobs: [job("link-sync", links), job("calendar-sync", calendars)],
    beat: async (name, details) => {
      beats.push([name, details])
    },
    sleep: async () => {
      if (links.length === 0) controller.abort()
    },
    log: (m) => logs.push(m),
  }
  return { deps, signal: controller.signal, logs, beats }
}

describe("runWorker", () => {
  it("runs every job each tick, beating and logging until stopped", async () => {
    const h = harness(
      [{ checked: 2 }, { checked: 0 }],
      [{ checked: 1 }, { checked: 0 }]
    )
    await runWorker(h.deps, h.signal)
    expect(h.beats).toEqual([
      ["link-sync", { checked: 2 }],
      ["calendar-sync", { checked: 1 }],
      ["link-sync", { checked: 0 }],
      ["calendar-sync", { checked: 0 }],
    ])
    expect(h.logs).toEqual([
      "sync worker started (link-sync, calendar-sync); every 60s",
      "link-sync: did 2",
      "calendar-sync: did 1",
      "sync worker stopped",
    ])
  })

  it("skips the beat when another worker holds the lock", async () => {
    const h = harness([null], [{ checked: 0 }])
    await runWorker(h.deps, h.signal)
    expect(h.beats).toEqual([["calendar-sync", { checked: 0 }]])
    expect(h.logs).toContain("link-sync: another worker is running it; skipped")
  })

  it("keeps going when a job fails", async () => {
    const h = harness([new Error("connection refused")], [{ checked: 3 }])
    await runWorker(h.deps, h.signal)
    expect(h.logs).toContain("link-sync failed: connection refused")
    expect(h.logs).toContain("calendar-sync: did 3")
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
