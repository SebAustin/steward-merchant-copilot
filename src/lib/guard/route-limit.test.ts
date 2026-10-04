import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TEST_DATABASE_URL, randomIp, testPool, uid } from '../../../test/setup/db'

const scheduled: (() => unknown)[] = []
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  after: (work: () => unknown) => void scheduled.push(work),
}))

const pool = testPool()
type Enforce = (request: Request, routeName: string, requestId: string) => Promise<Response | null>
let enforceRouteLimit: Enforce

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
  vi.stubEnv('SESSION_SECRET', 'route-limit-secret-0123456789-abcdefghij')
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  ;({ enforceRouteLimit } = await import('./route-limit'))
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await pool.end()
})

describe('enforceRouteLimit', () => {
  it('prunes stale rate-limit windows on a small fraction of requests, so rotating IPs cannot grow the table', async () => {
    const stale = uid('rotating-ip')
    await pool.query(
      "INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now() - interval '5 hours', 1)",
      [stale],
    )
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const request = new Request('https://steward.test/x', {
      headers: { 'x-forwarded-for': randomIp() },
    })

    expect(await enforceRouteLimit(request, 'probe', 'req-1')).toBeNull()
    expect(scheduled).toHaveLength(1)
    await scheduled[0]!()

    const { rowCount } = await pool.query('SELECT 1 FROM rate_limits WHERE key = $1', [stale])
    expect(rowCount).toBe(0)
    vi.restoreAllMocks()
  })
})
