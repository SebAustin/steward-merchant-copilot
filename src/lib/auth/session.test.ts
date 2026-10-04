import { describe, expect, it } from 'vitest'
import { createSessionId, signSession, verifySession } from './session'

const SECRET = 's'.repeat(40)
const NOW = 1_800_000_000_000
const HOUR = 3_600_000

describe('session cookie', () => {
  it('round-trips a signed session until it expires', () => {
    const sid = createSessionId()
    const cookie = signSession({ sid, now: NOW, ttlMs: 2 * HOUR }, SECRET)

    expect(verifySession(cookie, SECRET, NOW + HOUR)).toEqual({
      sid,
      expiresAt: NOW + 2 * HOUR,
    })
  })

  it('rejects an expired session', () => {
    const cookie = signSession({ sid: createSessionId(), now: NOW, ttlMs: HOUR }, SECRET)

    expect(verifySession(cookie, SECRET, NOW + HOUR)).toBeNull()
    expect(verifySession(cookie, SECRET, NOW + 2 * HOUR)).toBeNull()
  })

  it('rejects a cookie signed with another secret', () => {
    const cookie = signSession({ sid: createSessionId(), now: NOW, ttlMs: HOUR }, SECRET)

    expect(verifySession(cookie, 'x'.repeat(40), NOW)).toBeNull()
  })

  it('rejects a tampered session id or extended expiry', () => {
    const cookie = signSession({ sid: createSessionId(), now: NOW, ttlMs: HOUR }, SECRET)
    const [version, sid, exp, sig] = cookie.split('.')

    const otherSid = `${version}.${createSessionId()}.${exp}.${sig}`
    const longerExpiry = `${version}.${sid}.${Number(exp) + 10 * HOUR}.${sig}`

    expect(verifySession(otherSid, SECRET, NOW)).toBeNull()
    expect(verifySession(longerExpiry, SECRET, NOW)).toBeNull()
  })

  it.each([undefined, '', 'garbage', 'v1.a.b', 'v2.a.1.c', 'v1.a.notanumber.c', 'v1..1.c'])(
    'rejects malformed input %j without throwing',
    (value) => {
      expect(verifySession(value, SECRET, NOW)).toBeNull()
    },
  )

  it('issues unpredictable, distinct session ids that cannot break the cookie format', () => {
    const ids = new Set(Array.from({ length: 50 }, createSessionId))

    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{32}$/)
  })
})
