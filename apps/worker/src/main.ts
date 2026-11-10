/**
 * The background worker (motte #40): keeps linked GitHub/Jira items fresh.
 *
 *   bun run dev      (with turbo dev)      docker: `daily worker`
 *
 * One instance at a time does the work (a Postgres advisory lock); a
 * heartbeat row lets /api/health show when it last ran. Stops on SIGTERM.
 */
import { closeDatabase, services } from "@workspace/db"
import { LINK_SYNC_JOB } from "@workspace/db/core"
import { createIntegrations } from "@workspace/integrations"

import { ENV } from "./env"
import { runWorker, sleep } from "./loop"

const integrations = createIntegrations({ services })
const controller = new AbortController()
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => controller.abort())

await runWorker(
  {
    pass: () =>
      services.worker.exclusive(LINK_SYNC_JOB, async () => ({
        ...(await integrations.syncDue()),
      })),
    beat: (details) => services.worker.beat(LINK_SYNC_JOB, details),
    sleep,
    log: (message) => console.log(`[worker] ${message}`),
    intervalMs: ENV.SYNC_POLL_SECONDS * 1000,
  },
  controller.signal
)
await closeDatabase()
