import 'server-only'
import { getEnv } from '@/lib/env'
import { log } from '@/lib/log'
import { clientIp } from './client-ip'

type Reason = 'short' | 'unparseable'
const warned = new Set<Reason>()

/**
 * The rate-limit bucket for a request's client. Logs once per process and reason (counts only, no
 * addresses) when X-Forwarded-For has fewer entries than TRUSTED_PROXY_HOPS or the trusted entry
 * is not an IP address, because then visitors would share the `unknown` bucket.
 */
export function requestClientBucket(request: Request): string {
  const hops = getEnv().TRUSTED_PROXY_HOPS
  const { bucket, short, unparseable } = clientIp(request.headers, hops)
  const reason: Reason | null = short ? 'short' : unparseable ? 'unparseable' : null
  if (reason && !warned.has(reason)) {
    warned.add(reason)
    const entries = request.headers.get('x-forwarded-for')?.split(',').length ?? 0
    log.warn(
      { reason, entries, trustedHops: hops },
      'X-Forwarded-For does not match TRUSTED_PROXY_HOPS',
    )
  }
  return bucket
}

/** Test hook: forget which warnings were already logged. */
export function resetClientKeyWarning(): void {
  warned.clear()
}
