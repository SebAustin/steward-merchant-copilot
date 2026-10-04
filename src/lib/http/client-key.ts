import 'server-only'
import { getEnv } from '@/lib/env'
import { log } from '@/lib/log'
import { clientIp } from './client-ip'

let warned = false

/**
 * The rate-limit bucket for a request's client. Logs once per process (counts only, no addresses)
 * when X-Forwarded-For has fewer entries than TRUSTED_PROXY_HOPS, because then every visitor
 * would share the `unknown` bucket.
 */
export function requestClientBucket(request: Request): string {
  const hops = getEnv().TRUSTED_PROXY_HOPS
  const { bucket, short } = clientIp(request.headers, hops)
  if (short && !warned) {
    warned = true
    const entries = request.headers.get('x-forwarded-for')?.split(',').length ?? 0
    log.warn(
      { entries, trustedHops: hops },
      'X-Forwarded-For has fewer entries than TRUSTED_PROXY_HOPS',
    )
  }
  return bucket
}

/** Test hook: forget that the warning was already logged. */
export function resetClientKeyWarning(): void {
  warned = false
}
