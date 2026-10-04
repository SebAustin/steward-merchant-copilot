import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createSessionId, signSession } from '@/lib/auth/session'
import { MESSAGES } from '@/lib/http/messages'

// Nothing listens on port 1: every database call fails fast with ECONNREFUSED.
const DEAD_DATABASE = 'postgres://u:p@127.0.0.1:1/steward_test'
const ORIGIN = 'https://steward.test'
const SECRET = 'failure-test-secret-0123456789-abcdefghij'

type Route = { POST: (r: Request) => Promise<Response>; DELETE: (r: Request) => Promise<Response> }
let route: Route

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', DEAD_DATABASE)
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  route = await import('./route')
})
afterAll(() => vi.unstubAllEnvs())

const headers = { host: 'steward.test', origin: ORIGIN, 'content-type': 'application/json' }

describe('session routes with the database down', () => {
  it('fails closed on login: 503, a request id in body and header, and no cookie', async () => {
    const res = await route.POST(
      new Request(`${ORIGIN}/api/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ passcode: 'espresso-2026' }),
      }),
    )

    expect(res.status).toBe(503)
    expect(res.headers.get('set-cookie')).toBeNull()
    const body = (await res.json()) as {
      error: { code: string; message: string; requestId: string }
    }
    expect(body.error).toMatchObject({ code: 'unavailable', message: MESSAGES.unavailable })
    expect(res.headers.get('x-request-id')).toBe(body.error.requestId)
  })

  it('still clears the cookie in the browser when sign-out cannot reach the database', async () => {
    const res = await route.DELETE(
      new Request(`${ORIGIN}/api/session`, {
        method: 'DELETE',
        headers: {
          ...headers,
          cookie: `steward_session=${signSession({ sid: createSessionId(), now: Date.now(), ttlMs: 60_000 }, SECRET)}`,
        },
      }),
    )

    expect(res.status).toBe(503)
    expect(res.headers.get('set-cookie')).toMatch(/steward_session=;.*Max-Age=0/i)
  })
})
