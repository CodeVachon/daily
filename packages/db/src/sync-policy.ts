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
