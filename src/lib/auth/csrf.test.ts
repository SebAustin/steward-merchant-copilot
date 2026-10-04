import { describe, expect, it } from 'vitest'
import { csrfTokenFor, verifyCsrf } from './csrf'

const SECRET = 's'.repeat(40)
const SID = 'session-id-one'

const request = (over: Partial<Parameters<typeof verifyCsrf>[0]> = {}) => ({
  sid: SID,
  secret: SECRET,
  token: csrfTokenFor(SID, SECRET),
  origin: 'https://steward.example.com',
  host: 'steward.example.com',
  ...over,
})

describe('verifyCsrf', () => {
  it('accepts the session token from the same origin', () => {
    expect(verifyCsrf(request())).toBe(true)
  })

  it('binds the token to the session', () => {
    expect(csrfTokenFor('session-id-two', SECRET)).not.toBe(csrfTokenFor(SID, SECRET))
    expect(verifyCsrf(request({ token: csrfTokenFor('session-id-two', SECRET) }))).toBe(false)
  })

  it('rejects a missing, malformed or forged token', () => {
    expect(verifyCsrf(request({ token: undefined }))).toBe(false)
    expect(verifyCsrf(request({ token: '' }))).toBe(false)
    expect(verifyCsrf(request({ token: 'short' }))).toBe(false)
    expect(verifyCsrf(request({ token: csrfTokenFor(SID, 'x'.repeat(40)) }))).toBe(false)
  })

  it('rejects a cross-site or missing Origin even with a valid token', () => {
    expect(verifyCsrf(request({ origin: 'https://evil.example.com' }))).toBe(false)
    expect(verifyCsrf(request({ origin: undefined }))).toBe(false)
    expect(verifyCsrf(request({ origin: 'null' }))).toBe(false)
    expect(verifyCsrf(request({ origin: 'https://steward.example.com.evil.io' }))).toBe(false)
  })

  it('compares the port as part of the host', () => {
    expect(verifyCsrf(request({ origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(
      true,
    )
    expect(verifyCsrf(request({ origin: 'http://localhost:3000', host: 'localhost:4000' }))).toBe(
      false,
    )
  })
})
