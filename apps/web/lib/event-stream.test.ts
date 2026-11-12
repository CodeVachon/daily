import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CALENDAR_SSE,
  eventStream,
  formatSse,
  type LiveChange,
} from "./event-stream"

const change = (seq: number, taskId = "t1"): LiveChange => ({
  seq,
  taskId,
  actorType: "agent",
  clientId: "claude-code",
})

async function readSome(stream: ReadableStream<Uint8Array>, chunks: number) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ""
  for (let i = 0; i < chunks; i++) {
    const { value, done } = await reader.read()
    if (done) break
    text += decoder.decode(value)
  }
  reader.releaseLock()
  return text
}

function bus() {
  let push: (c: LiveChange) => void = () => {}
  const unsubscribe = vi.fn(async () => {})
  return {
    subscribe: vi.fn(async (onChange: (c: LiveChange) => void) => {
      push = onChange
      return unsubscribe
    }),
    push: (c: LiveChange) => push(c),
    unsubscribe,
  }
}

afterEach(() => vi.useRealTimers())

describe("formatSse", () => {
  it("writes id, event and JSON data", () => {
    expect(formatSse(change(7))).toBe(
      'id: 7\nevent: change\ndata: {"seq":7,"taskId":"t1","actorType":"agent","clientId":"claude-code"}\n\n'
    )
  })
})

describe("eventStream", () => {
  it("streams live changes once each, then cleans up on disconnect", async () => {
    const b = bus()
    const controller = new AbortController()
    const stream = eventStream({
      subscribe: b.subscribe,
      missedSince: async () => [],
      lastEventId: null,
      signal: controller.signal,
    })
    expect(await readSome(stream, 1)).toBe("retry: 5000\n\n")
    b.push(change(1))
    b.push(change(1))
    b.push(change(2))
    const text = await readSome(stream, 2)
    expect(text.match(/^id: /gm)).toEqual(["id: ", "id: "])
    controller.abort()
    await vi.waitFor(() => expect(b.unsubscribe).toHaveBeenCalled())
  })

  it("tells the page about calendar changes, without an id", async () => {
    let push = () => {}
    const off = vi.fn(async () => {})
    const controller = new AbortController()
    const stream = eventStream({
      subscribe: bus().subscribe,
      subscribeCalendar: async (onChange) => {
        push = onChange
        return off
      },
      missedSince: async () => [],
      lastEventId: null,
      signal: controller.signal,
    })
    await readSome(stream, 1)
    push()
    expect(await readSome(stream, 1)).toBe(CALENDAR_SSE)
    controller.abort()
    await vi.waitFor(() => expect(off).toHaveBeenCalled())
  })

  it("replays what a reconnecting client missed", async () => {
    const b = bus()
    const missedSince = vi.fn(async () => [change(5), change(6)])
    const stream = eventStream({
      subscribe: b.subscribe,
      missedSince,
      lastEventId: "4",
      signal: new AbortController().signal,
    })
    const text = await readSome(stream, 3)
    expect(missedSince).toHaveBeenCalledWith(4)
    expect(text).toContain("id: 5\n")
    expect(text).toContain("id: 6\n")
    // A live copy of an already-replayed change isn't sent again.
    b.push(change(6))
    b.push(change(7))
    expect(await readSome(stream, 1)).toContain("id: 7\n")
  })

  it("sends heartbeats", async () => {
    vi.useFakeTimers()
    const stream = eventStream({
      subscribe: bus().subscribe,
      missedSince: async () => [],
      lastEventId: null,
      signal: new AbortController().signal,
      heartbeatMs: 1000,
    })
    await readSome(stream, 1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await readSome(stream, 1)).toBe(": ping\n\n")
  })

  it("closes straight away if the client is already gone", async () => {
    const b = bus()
    const stream = eventStream({
      subscribe: b.subscribe,
      missedSince: async () => [],
      lastEventId: null,
      signal: AbortSignal.abort(),
    })
    const reader = stream.getReader()
    await reader.read()
    expect((await reader.read()).done).toBe(true)
    expect(b.unsubscribe).toHaveBeenCalled()
  })
})
