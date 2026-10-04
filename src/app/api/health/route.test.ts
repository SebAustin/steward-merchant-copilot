import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TEST_DATABASE_URL } from '../../../../test/setup/db'

type Route = { GET: (r?: Request) => Promise<Response> }
let route: Route

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
  vi.stubEnv('SESSION_SECRET', 'health-test-secret-0123456789-abcdefghij')
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  route = await import('./route')
})

afterAll(() => vi.unstubAllEnvs())

describe('GET /api/health', () => {
  it('returns pass/fail booleans only, with skipped checks listed separately', async () => {
    const res = await route.GET(new Request('https://steward.test/api/health'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ checks: { db: true }, skipped: ['paypal', 'model'] })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('is not rate limited: a prober hitting it repeatedly always gets an answer', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 70; i++) {
      statuses.push((await route.GET(new Request('https://steward.test/api/health'))).status)
    }

    expect(new Set(statuses)).toEqual(new Set([200]))
  })
})
