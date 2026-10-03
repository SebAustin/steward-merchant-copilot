import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TEST_DATABASE_URL } from '../../../../test/setup/db'

type Route = { GET: (r: Request) => Promise<Response> }
let route: Route

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
  vi.stubEnv('SESSION_SECRET', 'health-test-secret-0123456789-abcdefghij')
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  route = await import('./route')
})

afterAll(() => vi.unstubAllEnvs())

const get = (ip: string) =>
  route.GET(new Request('https://steward.test/api/health', { headers: { 'x-forwarded-for': ip } }))

describe('GET /api/health', () => {
  it('returns pass/fail booleans only, with skipped for checks that await credentials', async () => {
    const res = await get(`198.51.100.${crypto.randomUUID()}`)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ db: true, paypal: 'skipped', model: 'skipped' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('answers 429 once a client exceeds 60 requests a minute', async () => {
    const ip = `198.51.100.${crypto.randomUUID()}`
    const statuses: number[] = []
    for (let i = 0; i < 61; i++) statuses.push((await get(ip)).status)

    expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true)
    expect(statuses[60]).toBe(429)
  })
})
