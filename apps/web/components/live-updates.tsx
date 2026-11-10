"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import type { LiveChange } from "@/lib/event-stream"
import {
  createRefreshScheduler,
  flashRemaining,
  isBusy,
  LIVE_CHANGE_EVENT,
  recordFlash,
} from "@/lib/live"

/**
 * Keeps the open page current: listens to /api/events and refreshes the
 * server components when tasks change, from here, another tab, an agent or
 * the sync worker. Waits while the user is typing or dragging.
 */
export function LiveUpdates() {
  const router = useRouter()
  useEffect(() => {
    const scheduler = createRefreshScheduler({
      refresh: () => router.refresh(),
      isBusy: () => isBusy(document),
    })
    const source = new EventSource("/api/events")
    source.addEventListener("change", (event) => {
      const change = JSON.parse((event as MessageEvent<string>).data)
      recordFlash(change)
      window.dispatchEvent(
        new CustomEvent(LIVE_CHANGE_EVENT, { detail: change })
      )
      scheduler.notify()
    })
    return () => {
      source.close()
      scheduler.dispose()
    }
  }, [router])
  return null
}

/**
 * True for a few seconds after an agent or sync changes this task, including
 * after the card remounts (e.g. it moved to another column).
 */
export function useLiveFlash(taskId: string): boolean {
  const [flash, setFlash] = useState(() => flashRemaining(taskId) > 0)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      const left = flashRemaining(taskId)
      setFlash(left > 0)
      clearTimeout(timer)
      if (left > 0) timer = setTimeout(update, left)
    }
    update()
    const onChange = (event: Event) => {
      if ((event as CustomEvent<LiveChange>).detail.taskId === taskId) update()
    }
    window.addEventListener(LIVE_CHANGE_EVENT, onChange)
    return () => {
      window.removeEventListener(LIVE_CHANGE_EVENT, onChange)
      clearTimeout(timer)
    }
  }, [taskId])
  return flash
}
