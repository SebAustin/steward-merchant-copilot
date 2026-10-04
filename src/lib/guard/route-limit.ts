import 'server-only'
import { after } from 'next/server'
import { getDb } from '@/db'
import { requestClientBucket } from '@/lib/http/client-key'
import { jsonError } from '@/lib/http/respond'
import { log } from '@/lib/log'
import { maybePrune } from './prune'
import { rateLimit } from './rate-limit'

const ROUTE_LIMIT = 60
const ROUTE_WINDOW_SEC = 60

/**
 * The per-IP limit routes share (60/min, PLAN section 9). Returns a 429 response to send, or null
 * to continue. Throws if the limiter cannot reach the database (callers fail closed). The public
 * health route is exempt: it is cached instead.
 */
export async function enforceRouteLimit(
  request: Request,
  routeName: string,
  requestId: string,
): Promise<Response | null> {
  const result = await rateLimit(getDb(), {
    key: `route:${routeName}:${requestClientBucket(request)}`,
    limit: ROUTE_LIMIT,
    windowSec: ROUTE_WINDOW_SEC,
  })
  // Every request is a chance to prune, so rotating client addresses cannot outgrow the table.
  after(() =>
    maybePrune(getDb()).catch((error: unknown) => log.warn({ requestId, error }, 'prune failed')),
  )
  if (result.allowed) return null
  return jsonError({
    status: 429,
    code: 'rate_limited',
    requestId,
    headers: { 'retry-after': String(result.retryAfterSec) },
  })
}
