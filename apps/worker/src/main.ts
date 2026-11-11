/**
 * The background worker: keeps linked GitHub/Jira items fresh (motte #40)
 * and mirrors the selected Google calendars (motte #67).
 *
 *   bun run dev      (with turbo dev)      docker: `daily worker`
 *
 * One instance at a time does each job (a Postgres advisory lock); a
 * heartbeat row per job lets /api/health show when it last ran. Stops on
 * SIGTERM.
 */
import { closeDatabase, services } from "@workspace/db"
import { CALENDAR_SYNC_JOB, LINK_SYNC_JOB } from "@workspace/db/core"
import { createIntegrations, googleConfig } from "@workspace/integrations"

import { ENV } from "./env"
import { runWorker, sleep } from "./loop"

const integrations = createIntegrations({
  services,
  google: googleConfig(ENV),
})
const controller = new AbortController()
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => controller.abort())

await runWorker(
  {
    jobs: [
      {
        name: LINK_SYNC_JOB,
        run: () =>
          services.worker.exclusive(LINK_SYNC_JOB, async () => ({
            ...(await integrations.syncDue()),
          })),
        describe: ({ checked, failed }) =>
          checked ? `synced ${checked} link(s), ${failed} failed` : null,
      },
      {
        name: CALENDAR_SYNC_JOB,
        run: () =>
          services.worker.exclusive(CALENDAR_SYNC_JOB, async () => ({
            ...(await integrations.syncCalendars()),
          })),
        describe: ({ calendars, changed, failed }) =>
          changed || failed
            ? `${calendars} calendar(s): ${changed} event change(s), ${failed} failed`
            : null,
      },
    ],
    beat: (job, details) => services.worker.beat(job, details),
    sleep,
    log: (message) => console.log(`[worker] ${message}`),
    intervalMs: ENV.SYNC_POLL_SECONDS * 1000,
  },
  controller.signal
)
await closeDatabase()
