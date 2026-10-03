import 'server-only'
import { getDb } from '@/db'
import { clientIp } from '@/lib/auth/client-ip'
import { getEnv } from '@/lib/env'
import { jsonError } from '@/lib/http/respond'
import { rateLimit } from './rate-limit'

const ROUTE_LIMIT = 60
const ROUTE_WINDOW_SEC = 60

/**
 * The per-IP limit every route shares (60/min, PLAN section 9). Returns a 429 response to send,
 * or null to continue. Fails closed (503) when the limiter itself cannot be reached.
 */
export async function enforceRouteLimit(
  request: Request,
  routeName: string,
): Promise<Response | null> {
  const ip = clientIp(request.headers, getEnv().TRUSTED_PROXY_HOPS)
  const result = await rateLimit(getDb(), {
    key: `route:${routeName}:${ip}`,
    limit: ROUTE_LIMIT,
    windowSec: ROUTE_WINDOW_SEC,
  })
  if (result.allowed) return null
  return jsonError(429, 'rate_limited', 'Too many requests. Please slow down.', {
    'retry-after': String(result.retryAfterSec),
  })
}
