import { beforeEach, describe, expect, it, vi } from 'vitest'

const warn = vi.fn()
vi.mock('@/lib/log', () => ({ log: { warn, info: vi.fn(), error: vi.fn() } }))

const { requestClientBucket, resetClientKeyWarning } = await import('./client-key')

const req = (xff?: string) =>
  new Request('https://steward.test/x', xff ? { headers: { 'x-forwarded-for': xff } } : {})

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/x')
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  vi.stubEnv('SESSION_SECRET', 'k'.repeat(40))
  vi.stubEnv('TRUSTED_PROXY_HOPS', '2')
  warn.mockClear()
  resetClientKeyWarning()
})

describe('requestClientBucket', () => {
  it('returns the bucket for the trusted hop without logging', () => {
    expect(requestClientBucket(req('9.9.9.9, 203.0.113.7, 10.0.0.1'))).toBe('203.0.113.7')
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns once, with counts only, when the chain is shorter than the trusted hops', () => {
    expect(requestClientBucket(req('203.0.113.7'))).toBe('unknown')
    requestClientBucket(req('203.0.113.8'))
    requestClientBucket(req())

    expect(warn).toHaveBeenCalledTimes(1)
    const [fields] = warn.mock.calls[0] as [Record<string, unknown>]
    expect(fields).toEqual({ reason: 'short', entries: 1, trustedHops: 2 })
  })

  it('also warns once when the trusted entry is not an IP address', () => {
    // TRUSTED_PROXY_HOPS is 2: the entry two from the right is the one that gets trusted.
    expect(requestClientBucket(req('garbage, 203.0.113.7'))).toBe('unknown')
    requestClientBucket(req('more-garbage, 203.0.113.7'))

    expect(warn).toHaveBeenCalledTimes(1)
    const [fields] = warn.mock.calls[0] as [Record<string, unknown>]
    expect(fields).toEqual({ reason: 'unparseable', entries: 2, trustedHops: 2 })
  })
})
