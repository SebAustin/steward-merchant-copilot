const UNKNOWN = 'unknown'

/**
 * The client address as seen by the trusted reverse proxy. Entries to the left of the trusted
 * hops are client-supplied and ignored, so a spoofed X-Forwarded-For cannot dodge a rate limit.
 */
export function clientIp(headers: Headers, trustedHops: number): string {
  if (trustedHops < 1) return UNKNOWN
  const forwarded =
    headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((part) => part.trim()) ?? []
  return forwarded[forwarded.length - trustedHops] || UNKNOWN
}
