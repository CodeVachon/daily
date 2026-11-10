import { services } from "@workspace/db"

export const dynamic = "force-dynamic"

/**
 * Health for the container HEALTHCHECK and uptime monitoring: 200 when the
 * database answers and every migration in this build is applied, else 503.
 * Public, and reveals only counts.
 */
export async function GET() {
  const report = await services.health.check()
  return Response.json(report, {
    status: report.ok ? 200 : 503,
    headers: { "cache-control": "no-store" },
  })
}
