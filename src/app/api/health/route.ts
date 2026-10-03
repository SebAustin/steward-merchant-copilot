import { sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { checkHealth, isHealthy } from '@/features/health/check'
import { enforceRouteLimit } from '@/lib/guard/route-limit'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'

/** Public, read-only health check for Render and hosted-health.yml: booleans only. */
export async function GET(request: Request): Promise<Response> {
  const limited = await enforceRouteLimit(request, 'health').catch((error: unknown) => {
    // A broken limiter must not hide a broken database from the health check itself.
    log.warn({ route: '/api/health', error }, 'route limiter unavailable')
    return null
  })
  if (limited) return limited

  const report = await checkHealth({
    pingDb: async () => {
      await getDb().execute(sql`select 1`)
    },
  })
  return Response.json(report, {
    status: isHealthy(report) ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  })
}
