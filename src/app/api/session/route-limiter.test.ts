import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { csrfTokenFor } from '@/lib/auth/csrf'
import { verifySession } from '@/lib/auth/session'
import { TEST_DATABASE_URL, randomIp } from '../../../../test/setup/db'

const SECRET = 'limiter-test-secret-0123456789-abcdefghij'
const ORIGIN = 'https://steward.test'

// Only the limiter is broken; the database is healthy.
vi.mock('@/lib/guard/route-limit', () => ({
  enforceRouteLimit: vi.fn().mockRejectedValue(new Error('limiter down')),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  after: (work: () => unknown) => void Promise.resolve(work()),
}))

type Route = { POST: (r: Request) => Promise<Response>; DELETE: (r: Request) => Promise<Response> }
let route: Route

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  route = await import('./route')
})
afterAll(() => vi.unstubAllEnvs())

describe('sign-out when the route limiter is down', () => {
  it('still revokes the session and clears the cookie', async () => {
    // Log in through the real login() path by calling the library directly (the route's own
    // limiter is the thing under test, so POST would fail closed).
    const { login } = await import('@/lib/auth')
    const result = await login({ passcode: 'espresso-2026', ip: randomIp() })
    if (!result.ok) throw new Error('login failed')
    const sid = verifySession(result.cookie.value, SECRET, Date.now())!.sid

    const res = await route.DELETE(
      new Request(`${ORIGIN}/api/session`, {
        method: 'DELETE',
        headers: {
          host: 'steward.test',
          origin: ORIGIN,
          cookie: `steward_session=${result.cookie.value}`,
          'x-csrf-token': csrfTokenFor(sid, SECRET),
        },
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(/steward_session=;.*Max-Age=0/i)
  })

  it('fails login closed with 503 because it cannot count the attempt', async () => {
    const res = await route.POST(
      new Request(`${ORIGIN}/api/session`, {
        method: 'POST',
        headers: { host: 'steward.test', origin: ORIGIN, 'content-type': 'application/json' },
        body: JSON.stringify({ passcode: 'espresso-2026' }),
      }),
    )

    expect(res.status).toBe(503)
  })
})
