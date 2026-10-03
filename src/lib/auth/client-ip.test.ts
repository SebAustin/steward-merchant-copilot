import { describe, expect, it } from 'vitest'
import { clientIp } from './client-ip'

describe('clientIp', () => {
  it('takes the address the nearest trusted proxy saw, not a client-supplied one', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })

    expect(clientIp(headers, 1)).toBe('203.0.113.9')
  })

  it('walks back one entry per additional trusted hop', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9, 10.0.0.2' })

    expect(clientIp(headers, 2)).toBe('203.0.113.9')
  })

  it('falls back to a shared bucket when the header is absent or too short', () => {
    expect(clientIp(new Headers(), 1)).toBe('unknown')
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1' }), 2)).toBe('unknown')
  })

  it('ignores the header entirely when no proxy is trusted', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1' }), 0)).toBe('unknown')
  })
})
