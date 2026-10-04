import { describe, expect, it } from 'vitest'
import { clientIp } from './client-ip'

const xff = (value: string) => new Headers({ 'x-forwarded-for': value })

describe('clientIp', () => {
  it('takes the address the nearest trusted proxy saw, not a client-supplied one', () => {
    expect(clientIp(xff('6.6.6.6, 203.0.113.9'), 1)).toEqual({
      bucket: '203.0.113.9',
      short: false,
      unparseable: false,
    })
  })

  it('walks back one entry per additional trusted hop', () => {
    expect(clientIp(xff('6.6.6.6, 203.0.113.9, 10.0.0.2'), 2).bucket).toBe('203.0.113.9')
  })

  it('falls back to a shared bucket when the header is absent, and flags a short chain', () => {
    expect(clientIp(new Headers(), 1)).toMatchObject({ bucket: 'unknown', short: true })
    expect(clientIp(xff('1.1.1.1'), 2)).toMatchObject({ bucket: 'unknown', short: true })
  })

  it('ignores the header entirely when no proxy is trusted', () => {
    expect(clientIp(xff('1.1.1.1'), 0)).toMatchObject({ bucket: 'unknown', short: false })
  })

  it('buckets IPv6 by /64 so one host cannot rotate through its whole prefix', () => {
    const a = clientIp(xff('2001:db8:aaaa:bbbb::1'), 1).bucket
    const b = clientIp(xff('2001:0db8:aaaa:bbbb:ffff:eeee:dddd:cccc'), 1).bucket
    const other = clientIp(xff('2001:db8:aaaa:cccc::1'), 1).bucket

    expect(a).toBe('2001:db8:aaaa:bbbb::/64')
    expect(b).toBe(a)
    expect(other).not.toBe(a)
  })

  it('expands :: correctly at the start, middle and end', () => {
    expect(clientIp(xff('::1'), 1).bucket).toBe('0:0:0:0::/64')
    expect(clientIp(xff('2001:db8::'), 1).bucket).toBe('2001:db8:0:0::/64')
    expect(clientIp(xff('fe80::1:2:3:4'), 1).bucket).toBe('fe80:0:0:0::/64')
  })

  it('treats an IPv4-mapped IPv6 address as the IPv4 address', () => {
    expect(clientIp(xff('::ffff:203.0.113.9'), 1).bucket).toBe('203.0.113.9')
  })

  it('puts an unparseable entry in the shared bucket instead of trusting it as a key', () => {
    expect(clientIp(xff('not-an-ip'), 1).bucket).toBe('unknown')
  })

  it('strips a port from IPv4 and bracketed IPv6 entries so they share the plain address bucket', () => {
    expect(clientIp(xff('203.0.113.9:51234'), 1).bucket).toBe('203.0.113.9')
    expect(clientIp(xff('[2001:db8:aaaa:bbbb::1]:443'), 1).bucket).toBe('2001:db8:aaaa:bbbb::/64')
    expect(clientIp(xff('[2001:db8:aaaa:bbbb::1]'), 1).bucket).toBe('2001:db8:aaaa:bbbb::/64')
  })

  it('flags an unparseable entry so a misconfiguration is visible', () => {
    expect(clientIp(xff('not-an-ip'), 1)).toEqual({
      bucket: 'unknown',
      short: false,
      unparseable: true,
    })
    expect(clientIp(xff('203.0.113.9'), 1).unparseable).toBe(false)
  })
})
