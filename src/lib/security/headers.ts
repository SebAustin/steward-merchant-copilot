import { randomBytes } from 'node:crypto'

const NONCE_BYTES = 16
const HSTS_MAX_AGE_SECONDS = 31_536_000

/** A fresh per-request CSP nonce (128 random bits, base64). */
export function createNonce(): string {
  return randomBytes(NONCE_BYTES).toString('base64')
}

/**
 * Content-Security-Policy per PLAN section 9. Scripts need the per-request nonce; inline styles
 * stay allowed because AG Grid injects runtime styles. `connect-src 'self'` keeps the browser
 * from talking to anyone but this origin (PayPal and Anthropic are server-side only).
 */
export function buildCsp(nonce: string, options: Readonly<{ isDev: boolean }>): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.isDev ? [] : ['upgrade-insecure-requests']),
  ]
  return directives.join('; ')
}

/** Non-CSP security headers (HSTS is skipped in development so localhost is never pinned). */
export function securityHeaders(
  options: Readonly<{ isDev: boolean }>,
): Readonly<Record<string, string>> {
  return {
    ...(options.isDev
      ? {}
      : {
          'Strict-Transport-Security': `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
        }),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}
