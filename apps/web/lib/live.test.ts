import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createRefreshScheduler,
  FLASH_MS,
  flashRemaining,
  isBusy,
  recordFlash,
} from "./live"

afterEach(() => vi.useRealTimers())

const doc = (
  active: Partial<HTMLElement & { type: string }> | null,
  hold?: string
) =>
  ({
    activeElement: active,
    body: { dataset: hold ? { liveHold: hold } : {} },
  }) as unknown as Document

describe("isBusy", () => {
  it.each([
    [{ tagName: "TEXTAREA" }, true],
    [{ tagName: "INPUT", type: "text" }, true],
    [{ tagName: "INPUT", type: "search" }, true],
    [{ tagName: "DIV", isContentEditable: true }, true],
    [{ tagName: "INPUT", type: "checkbox" }, false],
    [{ tagName: "BUTTON" }, false],
    [null, false],
  ])("%j → %s", (active, busy) => {
    expect(isBusy(doc(active))).toBe(busy)
  })

  it("is busy while something holds refreshes (a drag)", () => {
    expect(isBusy(doc(null, "drag"))).toBe(true)
  })
})

describe("createRefreshScheduler", () => {
  it("turns a burst of changes into one refresh", async () => {
    vi.useFakeTimers()
    const refresh = vi.fn()
    const s = createRefreshScheduler({ refresh, isBusy: () => false })
    s.notify()
    s.notify()
    s.notify()
    await vi.advanceTimersByTimeAsync(400)
    expect(refresh).toHaveBeenCalledTimes(1)
    s.notify()
    await vi.advanceTimersByTimeAsync(400)
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it("waits until the user is no longer busy", async () => {
    vi.useFakeTimers()
    const refresh = vi.fn()
    let busy = true
    const s = createRefreshScheduler({ refresh, isBusy: () => busy })
    s.notify()
    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).not.toHaveBeenCalled()
    busy = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("does nothing after dispose", async () => {
    vi.useFakeTimers()
    const refresh = vi.fn()
    const s = createRefreshScheduler({ refresh, isBusy: () => false })
    s.notify()
    s.dispose()
    await vi.advanceTimersByTimeAsync(1000)
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe("flash", () => {
  const change = { seq: 1, clientId: null }
  it("highlights agent and sync changes for a while, not the user's", () => {
    expect(recordFlash({ ...change, taskId: "u", actorType: "user" }, 0)).toBe(
      false
    )
    expect(flashRemaining("u", 0)).toBe(0)
    expect(recordFlash({ ...change, taskId: "a", actorType: "agent" }, 0)).toBe(
      true
    )
    expect(
      recordFlash({ ...change, taskId: "s", actorType: "system" }, 0)
    ).toBe(true)
    expect(flashRemaining("a", 1000)).toBe(FLASH_MS - 1000)
    expect(flashRemaining("a", FLASH_MS + 1)).toBe(0)
    expect(flashRemaining("never", 0)).toBe(0)
  })
})
