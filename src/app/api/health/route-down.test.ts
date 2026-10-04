import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

type Route = { GET: () => Promise<Response> }
let route: Route

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://u:p@127.0.0.1:1/steward_test')
  vi.stubEnv('SESSION_SECRET', 'health-down-secret-0123456789-abcdefghij')
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  route = await import('./route')
})
afterAll(() => vi.unstubAllEnvs())

describe('GET /api/health with the database down', () => {
  it('answers 503 with db:false', async () => {
    const res = await route.GET()

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ checks: { db: false }, skipped: ['paypal', 'model'] })
  })
})
