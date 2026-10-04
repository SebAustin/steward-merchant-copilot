import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createSessionId, signSession } from '@/lib/auth/session'

const SECRET = 'proxy-test-secret-0123456789-abcdefghij'
type Proxy = (request: NextRequest) => Response
let proxy: Proxy

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/x')
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  proxy = (await import('./proxy')).proxy
})
afterAll(() => vi.unstubAllEnvs())

const validCookie = () =>
  `steward_session=${signSession({ sid: createSessionId(), now: Date.now(), ttlMs: 60_000 }, SECRET)}`

const visit = (path: string, cookie?: string) =>
  proxy(new NextRequest(`https://steward.test${path}`, { headers: cookie ? { cookie } : {} }))

describe('proxy', () => {
  it('redirects an anonymous page visit to the passcode page', () => {
    const res = visit('/queue')

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/enter')
  })

  it('answers an anonymous API call with 401 JSON', async () => {
    const res = visit('/api/chat')

    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: { code: 'unauthorized' } })
  })

  it('lets the passcode page and health check through anonymously', () => {
    expect(visit('/enter').status).toBe(200)
    expect(visit('/api/health').status).toBe(200)
  })

  it('lets a visitor with a validly signed cookie through, including to the passcode page', () => {
    // /enter must stay reachable: a revoked session still has a valid signature, and the page
    // (which checks the session row) decides whether to send them on to the Brief.
    expect(visit('/queue', validCookie()).status).toBe(200)
    expect(visit('/enter', validCookie()).status).toBe(200)
  })

  it('does not treat look-alike paths as public', () => {
    expect(visit('/entering').status).toBe(307)
    expect(visit('/api/healthz').status).toBe(401)
    expect(visit('/api/health/../chat').status).toBe(401)
  })

  it('treats a forged or expired cookie as anonymous', () => {
    const forged = 'steward_session=v1.abc.9999999999999.ZmFrZQ'
    const expired = `steward_session=${signSession({ sid: createSessionId(), now: 1, ttlMs: 1 }, SECRET)}`

    expect(visit('/queue', forged).status).toBe(307)
    expect(visit('/queue', expired).status).toBe(307)
  })

  it('puts a fresh-nonce CSP and the security headers on every kind of response', () => {
    const responses = [
      visit('/enter'),
      visit('/queue'),
      visit('/api/chat'),
      visit('/queue', validCookie()),
    ]

    const nonces = responses.map((res) => {
      const csp = res.headers.get('content-security-policy') ?? ''
      expect(csp).toContain("frame-ancestors 'none'")
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
      expect(res.headers.get('x-frame-options')).toBe('DENY')
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
      expect(res.headers.get('permissions-policy')).toContain('camera=()')
      return /'nonce-([^']+)'/.exec(csp)?.[1]
    })
    expect(new Set(nonces).size).toBe(nonces.length)
  })

  it('forwards the same CSP to the renderer so Next can stamp the nonce on its scripts', () => {
    const res = visit('/enter')

    expect(res.headers.get('x-middleware-request-content-security-policy')).toBe(
      res.headers.get('content-security-policy'),
    )
  })
})
