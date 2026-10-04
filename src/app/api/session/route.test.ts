import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MESSAGES } from '@/lib/http/messages'
import { csrfTokenFor } from '@/lib/auth/csrf'
import { verifySession } from '@/lib/auth/session'
import { TEST_DATABASE_URL, randomIp, testPool } from '../../../../test/setup/db'

const SECRET = 'route-test-secret-0123456789-abcdefghij'
const PASSCODE = 'espresso-2026'
const ORIGIN = 'https://steward.test'
const pool = testPool()

type Route = { POST: (r: Request) => Promise<Response>; DELETE: (r: Request) => Promise<Response> }
let route: Route

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('DEMO_PASSCODE', PASSCODE)
  vi.stubEnv('TRUSTED_PROXY_HOPS', '1')
  route = await import('./route')
})

afterAll(async () => {
  await pool.end()
  vi.unstubAllEnvs()
})

/** A unique client address per test keeps rate-limit buckets independent. */
const newIp = randomIp

// `after()` needs a Next request scope; run the callback inline instead.
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  after: (work: () => unknown) => void Promise.resolve(work()),
}))

function login(
  passcode: unknown,
  init: { ip?: string; origin?: string | null; raw?: string } = {},
) {
  const headers = new Headers({
    'content-type': 'application/json',
    host: 'steward.test',
    'x-forwarded-for': init.ip ?? newIp(),
  })
  if (init.origin !== null) headers.set('origin', init.origin ?? ORIGIN)
  return route.POST(
    new Request(`${ORIGIN}/api/session`, {
      method: 'POST',
      headers,
      body: init.raw ?? JSON.stringify({ passcode }),
    }),
  )
}

describe('POST /api/session (passcode login)', () => {
  it('sets a signed, HttpOnly, SameSite=Lax session cookie for the right passcode', async () => {
    const res = await login(PASSCODE)

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/^steward_session=/)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=lax/i)
    expect(setCookie).toMatch(/Secure/i)
    expect(setCookie).toMatch(/Path=\//)

    const value = /^steward_session=([^;]+)/.exec(setCookie)?.[1] ?? ''
    const session = verifySession(value, SECRET, Date.now())
    expect(session).not.toBeNull()

    const sidHash = createHash('sha256')
      .update(session?.sid ?? '')
      .digest('hex')
    const { rowCount } = await pool.query('SELECT 1 FROM sessions WHERE id_hash = $1', [sidHash])
    expect(rowCount).toBe(1)
  })

  it('rejects a wrong passcode without setting a cookie', async () => {
    const res = await login('not-the-passcode')

    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(await res.json()).toMatchObject({
      error: {
        code: 'invalid_passcode',
        message: MESSAGES.invalid_passcode,
        requestId: expect.any(String),
      },
    })
  })

  it('rejects malformed bodies', async () => {
    expect((await login(undefined)).status).toBe(400)
    expect((await login('')).status).toBe(400)
    expect((await login(12345)).status).toBe(400)
    expect((await login(null, { raw: 'not json' })).status).toBe(400)
  })

  it('refuses a cross-site or origin-less login even with the right passcode', async () => {
    const evil = await login(PASSCODE, { origin: 'https://evil.example' })
    const none = await login(PASSCODE, { origin: null })

    expect(evil.status).toBe(403)
    expect(none.status).toBe(403)
    expect(evil.headers.get('set-cookie')).toBeNull()
  })

  it('locks an address out after 5 attempts per window, even for the right passcode', async () => {
    const ip = newIp()
    for (let i = 0; i < 5; i++) expect((await login('wrong', { ip })).status).toBe(401)

    const locked = await login(PASSCODE, { ip })

    expect(locked.status).toBe(429)
    expect(Number(locked.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(locked.headers.get('set-cookie')).toBeNull()
  })

  it('does not count successful logins against the limit', async () => {
    const ip = newIp()
    for (let i = 0; i < 7; i++) expect((await login(PASSCODE, { ip })).status).toBe(200)

    // The allowance for wrong guesses is still intact afterwards.
    for (let i = 0; i < 5; i++) expect((await login('wrong', { ip })).status).toBe(401)
    expect((await login('wrong', { ip })).status).toBe(429)
  })

  it('does not let a spoofed X-Forwarded-For prefix dodge the limit', async () => {
    const realIp = newIp()
    for (let i = 0; i < 5; i++) {
      await login('wrong', { ip: `10.${i}.0.1, ${realIp}` })
    }

    expect((await login(PASSCODE, { ip: `99.99.99.99, ${realIp}` })).status).toBe(429)
  })
})

describe('DELETE /api/session (sign out)', () => {
  async function signedIn() {
    const res = await login(PASSCODE)
    const cookie = /^(steward_session=[^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? ''
    const sid = verifySession(cookie.split('=')[1], SECRET, Date.now())?.sid ?? ''
    return { cookie, csrf: csrfTokenFor(sid, SECRET) }
  }

  function logout(headers: Record<string, string>) {
    return route.DELETE(
      new Request(`${ORIGIN}/api/session`, {
        method: 'DELETE',
        headers: { host: 'steward.test', 'x-forwarded-for': newIp(), ...headers },
      }),
    )
  }

  it('requires a session', async () => {
    expect((await logout({ origin: ORIGIN })).status).toBe(401)
  })

  it('requires the CSRF token and a same-site Origin', async () => {
    const { cookie, csrf } = await signedIn()

    expect((await logout({ cookie, origin: ORIGIN })).status).toBe(403)
    expect((await logout({ cookie, origin: ORIGIN, 'x-csrf-token': 'forged' })).status).toBe(403)
    expect(
      (await logout({ cookie, origin: 'https://evil.example', 'x-csrf-token': csrf })).status,
    ).toBe(403)
  })

  it('rejects the old cookie after sign-out, even with a valid CSRF token', async () => {
    const { cookie, csrf } = await signedIn()
    const headers = { cookie, origin: ORIGIN, 'x-csrf-token': csrf }
    expect((await logout(headers)).status).toBe(200)

    const replay = await logout(headers)

    expect(replay.status).toBe(401)
  })

  it('clears the cookie when the CSRF token and Origin check out', async () => {
    const { cookie, csrf } = await signedIn()

    const res = await logout({ cookie, origin: ORIGIN, 'x-csrf-token': csrf })

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(/steward_session=;.*Max-Age=0/i)
  })
})
