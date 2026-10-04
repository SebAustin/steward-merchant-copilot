import { createHash } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { randomIp, testDb, testPool } from '../../../test/setup/db'
import {
  LOGIN_ATTEMPTS,
  LOGIN_SUCCESS_CAP,
  login,
  logout,
  requireSession,
  type AuthDeps,
  type LoginResult,
} from './index'
import { csrfTokenFor } from './csrf'
import { verifySession } from './session'

const pool = testPool()
const db = testDb(pool)
afterAll(() => pool.end())

const SECRET = 'auth-test-secret-0123456789-abcdefghij'
const PASSCODE = 'espresso-2026'
const HOST = 'steward.test'
const ORIGIN = `https://${HOST}`
const deps = (over: Partial<AuthDeps['env']> = {}): AuthDeps => ({
  db,
  env: { SESSION_SECRET: SECRET, DEMO_PASSCODE: PASSCODE, NODE_ENV: 'production', ...over },
})

const newIp = randomIp

function signedIn(result: LoginResult) {
  if (!result.ok) throw new Error(`login failed: ${result.reason}`)
  return result.cookie
}

function request(cookie: string | undefined, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/api/x`, {
    method: 'POST',
    headers: { host: HOST, ...(cookie ? { cookie } : {}), ...headers },
  })
}

describe('login', () => {
  it('issues a signed cookie and a session that requireSession accepts', async () => {
    const cookie = signedIn(await login({ passcode: PASSCODE, ip: newIp() }, deps()))

    expect(cookie.name).toBe('steward_session')
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    })
    expect(verifySession(cookie.value, SECRET, Date.now())).not.toBeNull()

    const check = await requireSession(request(`${cookie.name}=${cookie.value}`), {}, deps())
    expect(check.ok).toBe(true)
  })

  it('rejects a wrong passcode without issuing anything', async () => {
    const result = await login({ passcode: 'nope', ip: newIp() }, deps())

    expect(result).toEqual({ ok: false, reason: 'invalid_passcode' })
  })

  it('allows 5 wrong guesses per window, then refuses even the right passcode', async () => {
    const ip = newIp()
    for (let i = 0; i < LOGIN_ATTEMPTS; i++) {
      expect((await login({ passcode: 'wrong', ip }, deps())).ok).toBe(false)
    }

    const locked = await login({ passcode: PASSCODE, ip }, deps())

    expect(locked).toMatchObject({ ok: false, reason: 'login_rate_limited' })
    expect(locked.ok === false && locked.retryAfterSec).toBeGreaterThan(0)
  })

  it('does not spend the guess allowance on successful logins', async () => {
    const ip = newIp()
    for (let i = 0; i < 7; i++) signedIn(await login({ passcode: PASSCODE, ip }, deps()))

    for (let i = 0; i < LOGIN_ATTEMPTS; i++) await login({ passcode: 'wrong', ip }, deps())
    expect(await login({ passcode: 'wrong', ip }, deps())).toMatchObject({
      reason: 'login_rate_limited',
    })
  })

  it('caps successful logins per address per hour', async () => {
    const ip = newIp()
    for (let i = 0; i < LOGIN_SUCCESS_CAP; i++)
      signedIn(await login({ passcode: PASSCODE, ip }, deps()))

    expect(await login({ passcode: PASSCODE, ip }, deps())).toMatchObject({
      ok: false,
      reason: 'login_cap',
    })
  })
})

describe('requireSession', () => {
  async function newCookie() {
    const c = signedIn(await login({ passcode: PASSCODE, ip: newIp() }, deps()))
    return `${c.name}=${c.value}`
  }

  it('rejects a missing, forged or malformed cookie', async () => {
    for (const cookie of [undefined, 'steward_session=garbage', 'other=1']) {
      expect(await requireSession(request(cookie), {}, deps())).toMatchObject({
        ok: false,
        status: 401,
      })
    }
  })

  it('rejects the old cookie after sign-out (server-side revocation)', async () => {
    const cookie = await newCookie()
    const first = await requireSession(request(cookie), {}, deps())
    if (!first.ok) throw new Error('expected a valid session')

    const cleared = await logout(first.session, deps())
    const replay = await requireSession(request(cookie), {}, deps())

    expect(cleared.options.maxAge).toBe(0)
    expect(replay).toEqual({ ok: false, status: 401, code: 'unauthorized' })
  })

  it('rejects a session whose row has expired', async () => {
    const cookie = await newCookie()
    const sid = cookie.split('=')[1]!.split('.')[1]!
    await pool.query(
      "UPDATE sessions SET expires_at = now() - interval '1 second' WHERE id_hash = $1",
      [createHash('sha256').update(sid).digest('hex')],
    )

    expect(await requireSession(request(cookie), {}, deps())).toMatchObject({
      ok: false,
      status: 401,
    })
  })

  it('evicts sessions when DEMO_PASSCODE is rotated', async () => {
    const cookie = await newCookie()

    const rotated = await requireSession(
      request(cookie),
      {},
      deps({ DEMO_PASSCODE: 'new-passcode-2027' }),
    )

    expect(rotated).toMatchObject({ ok: false, status: 401 })
  })

  it('with csrf: true, needs this session token and a same-site Origin', async () => {
    const cookie = await newCookie()
    const sid = cookie.split('=')[1]!.split('.')[1]!
    const token = csrfTokenFor(sid, SECRET)
    const check = (headers: Record<string, string>) =>
      requireSession(request(cookie, headers), { csrf: true }, deps())

    expect((await check({ origin: ORIGIN })).ok).toBe(false)
    expect(await check({ origin: ORIGIN, 'x-csrf-token': 'forged' })).toMatchObject({ status: 403 })
    expect(await check({ origin: 'https://evil.example', 'x-csrf-token': token })).toMatchObject({
      status: 403,
      code: 'csrf',
    })
    expect(await check({ origin: ORIGIN, 'x-csrf-token': token })).toMatchObject({ ok: true })
  })
})
