// How often linked items are re-fetched by the sync worker (motte #40).

const MINUTE = 60

/** Seconds between syncs of one link. */
export const SYNC_INTERVALS = {
  /** Open or draft (or never synced): changes are likely. */
  active: 5 * MINUTE,
  /** Merged, done or closed: rarely change again. */
  settled: 6 * 60 * MINUTE,
  /** The last sync failed: back off, but keep trying. */
  failing: 15 * MINUTE,
} as const

/** A worker heartbeat older than this means the worker has stalled. */
export const WORKER_STALE_AFTER_SECONDS = 5 * MINUTE

/** The background job that keeps linked GitHub/Jira items fresh. */
export const LINK_SYNC_JOB = "link-sync"

/** The background job that mirrors the selected Google calendars. */
export const CALENDAR_SYNC_JOB = "calendar-sync"

/** A calendar's first (full) sync starts this many days back. */
export const CALENDAR_SYNC_PAST_DAYS = 30

/**
 * Events further ahead aren't kept (Google expands recurring events for
 * decades). Unchanged instances never come back in an incremental sync, so
 * a full sync every CALENDAR_FULL_SYNC_DAYS rolls the window forward.
 */
export const CALENDAR_SYNC_FUTURE_DAYS = 365
export const CALENDAR_FULL_SYNC_DAYS = 7
