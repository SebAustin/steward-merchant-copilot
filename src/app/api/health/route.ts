import { sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { checkHealth, createCachedHealth, isHealthy } from '@/features/health/check'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'

// Cached in-process, so this public route needs no rate limit and cannot fan out to dependencies.
const getHealth = createCachedHealth(() =>
  checkHealth({
    pingDb: async () => {
      await getDb().execute(sql`select 1`)
    },
    onError: (error) => log.warn({ route: '/api/health', error }, 'database health check failed'),
  }),
)

/** Public, read-only health check for Render and hosted-health.yml: booleans only. */
export async function GET(): Promise<Response> {
  const report = await getHealth()
  return Response.json(report, {
    status: isHealthy(report) ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  })
}
