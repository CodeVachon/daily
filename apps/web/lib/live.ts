// Client side of live updates (motte #34): when to refresh, what to flash.
import type { LiveChange } from "./event-stream"

/** Window event carrying each LiveChange, for components that react to it. */
export const LIVE_CHANGE_EVENT = "daily:change"

/** Set on <body> (data-live-hold) while a refresh would get in the way. */
export const LIVE_HOLD_ATTRIBUTE = "liveHold"

const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "url",
  "email",
  "number",
  "password",
  "tel",
  "date",
  "datetime-local",
  "time",
])

/**
 * Whether refreshing now would disrupt the user: typing in a field (a
 * refresh can remount the editor) or something like a drag holding it off.
 */
export function isBusy(doc: Pick<Document, "activeElement" | "body">): boolean {
  if (doc.body?.dataset[LIVE_HOLD_ATTRIBUTE]) return true
  const el = doc.activeElement as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true
  return (
    el.tagName === "INPUT" &&
    TEXT_INPUT_TYPES.has((el as HTMLInputElement).type ?? "")
  )
}

export interface RefreshScheduler {
  /** A change arrived: refresh soon (bursts become one refresh). */
  notify(): void
  dispose(): void
}

/**
 * Refresh `delayMs` after the first of a burst of changes; while `isBusy`,
 * check again every `retryMs` and refresh once the user is done.
 */
export function createRefreshScheduler({
  refresh,
  isBusy,
  delayMs = 400,
  retryMs = 1000,
}: {
  refresh: () => void
  isBusy: () => boolean
  delayMs?: number
  retryMs?: number
}): RefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null
  const fire = () => {
    if (isBusy()) {
      timer = setTimeout(fire, retryMs)
      return
    }
    timer = null
    refresh()
  }
  return {
    notify() {
      timer ??= setTimeout(fire, delayMs)
    },
    dispose() {
      if (timer) clearTimeout(timer)
      timer = null
    },
  }
}

/** How long a card stays highlighted after an agent or sync changes it. */
export const FLASH_MS = 2500

/**
 * When each task's highlight ends. Kept outside the cards so a card that
 * moves column (and remounts) stays highlighted.
 */
const flashUntil = new Map<string, number>()

/** Note a change; true when it should highlight (not the user's own). */
export function recordFlash(change: LiveChange, now = Date.now()): boolean {
  if (change.actorType === "user") return false
  flashUntil.set(change.taskId, now + FLASH_MS)
  return true
}

/** Milliseconds of highlight left for a task (0: none). */
export function flashRemaining(taskId: string, now = Date.now()): number {
  return Math.max(0, (flashUntil.get(taskId) ?? 0) - now)
}
