import { createHmac, timingSafeEqual } from 'node:crypto'

export const CSRF_HEADER = 'x-csrf-token'

/** Stateless CSRF token: an HMAC of the session id, so it dies with the session. */
export function csrfTokenFor(sid: string, secret: string): string {
  return createHmac('sha256', secret).update(`csrf.${sid}`).digest('base64url')
}

export type CsrfCheck = Readonly<{
  sid: string
  secret: string
  /** Value of the `x-csrf-token` request header. */
  token: string | undefined
  /** Value of the `Origin` request header. */
  origin: string | undefined
  /** Value of the `Host` request header. */
  host: string | undefined
}>

/** True when the Origin header names the same host (and port) the request was sent to. */
export function isSameOrigin(
  origin: string | undefined | null,
  host: string | undefined | null,
): boolean {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** True only when the token matches this session AND the Origin is this site (state-changing requests). */
export function verifyCsrf(check: CsrfCheck): boolean {
  if (!isSameOrigin(check.origin, check.host)) return false
  if (!check.token) return false
  const expected = Buffer.from(csrfTokenFor(check.sid, check.secret))
  const given = Buffer.from(check.token)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
