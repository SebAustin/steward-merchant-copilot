import { describe, expect, it } from 'vitest'
import { buildCsp, createNonce, securityHeaders } from './headers'

const directive = (csp: string, name: string) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `))

describe('buildCsp', () => {
  const nonce = 'dGVzdC1ub25jZQ=='

  it('allows scripts only by nonce and strict-dynamic, never unsafe-inline', () => {
    const script = directive(buildCsp(nonce, { isDev: false }), 'script-src')

    expect(script).toBe(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`)
  })

  it('permits unsafe-eval only in development (React debugging)', () => {
    expect(directive(buildCsp(nonce, { isDev: true }), 'script-src')).toContain("'unsafe-eval'")
    expect(buildCsp(nonce, { isDev: false })).not.toContain('unsafe-eval')
  })

  it('locks down framing, plugins, base URI, form targets and connections', () => {
    const csp = buildCsp(nonce, { isDev: false })

    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'form-action')).toBe("form-action 'self'")
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'")
    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
  })

  it('keeps inline styles allowed for AG Grid runtime styles (PLAN section 9)', () => {
    expect(directive(buildCsp(nonce, { isDev: false }), 'style-src')).toBe(
      "style-src 'self' 'unsafe-inline'",
    )
  })

  it('upgrades insecure requests only outside development', () => {
    expect(buildCsp(nonce, { isDev: false })).toContain('upgrade-insecure-requests')
    expect(buildCsp(nonce, { isDev: true })).not.toContain('upgrade-insecure-requests')
  })
})

describe('createNonce', () => {
  it('returns a fresh, unguessable base64 value every call', () => {
    const nonces = new Set(Array.from({ length: 100 }, createNonce))

    expect(nonces.size).toBe(100)
    for (const n of nonces) expect(n).toMatch(/^[A-Za-z0-9+/]{22}==$/)
  })
})

describe('securityHeaders', () => {
  it('sets the production header set from PLAN section 9', () => {
    const headers = securityHeaders({ isDev: false })

    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    )
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()')
  })

  it('omits HSTS in development so localhost is never pinned to HTTPS', () => {
    expect(securityHeaders({ isDev: true })['Strict-Transport-Security']).toBeUndefined()
  })
})
