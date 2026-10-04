import { describe, expect, it } from 'vitest'
import { redact } from './redact'

describe('redact', () => {
  it('masks values stored under secret-looking keys, at any depth', () => {
    const input = {
      route: '/api/session',
      passcode: 'hunter2',
      headers: { authorization: 'Bearer abc.def', 'x-csrf-token': 't0ken' },
      nested: [{ client_secret: 's3cret', ok: 1 }],
    }

    expect(redact(input)).toEqual({
      route: '/api/session',
      passcode: '[redacted]',
      headers: { authorization: '[redacted]', 'x-csrf-token': '[redacted]' },
      nested: [{ client_secret: '[redacted]', ok: 1 }],
    })
  })

  it('replaces Customer emails with a stable short hash and drops phone numbers', () => {
    const out = redact({ note: 'Contact dana@example.com or +1 (415) 555-0132 today' })

    expect(out.note).toMatch(/^Contact email:[0-9a-f]{8} or \[redacted\] today$/)
    expect(redact({ a: 'dana@example.com' }).a).toBe(redact({ b: 'dana@example.com' }).b)
    expect(redact({ a: 'dana@example.com' }).a).not.toBe(redact({ a: 'maya@example.com' }).a)
  })

  it('scrubs bearer tokens embedded in strings', () => {
    expect(redact({ msg: 'failed with Bearer eyJhbGciOi.abc-123_x' }).msg).toBe(
      'failed with Bearer [redacted]',
    )
  })

  it('keeps PayPal object IDs and numbers, and never mutates its input', () => {
    const input = Object.freeze({
      invoice: 'INV2-ABCD-1234-EFGH',
      due: '2026-10-05T12:00:00.000Z',
      amount: 1240,
      ok: true,
      none: null,
    })

    expect(redact(input)).toEqual(input)
  })

  it('keeps an error name, code, cause and stack, but scrubs secrets inside them', () => {
    const cause = Object.assign(new Error('connect to postgres://app:hunter2@db:5432/x failed'), {
      code: 'ECONNREFUSED',
    })
    const error = new Error('boom for dana@example.com', { cause })

    const out = redact({ err: error }).err as unknown as Record<string, unknown>

    expect(out).toMatchObject({ name: 'Error', message: expect.stringMatching(/^boom for email:/) })
    expect(String(out.stack)).toContain('redact.test.ts')
    expect(String(out.stack)).not.toContain('dana@example.com')
    expect(out.cause).toMatchObject({ code: 'ECONNREFUSED' })
    expect(JSON.stringify(out)).not.toContain('hunter2')
  })

  it('scrubs credentials embedded in connection URLs', () => {
    expect(redact({ msg: 'at postgres://user:p%40ss@host:5432/db?sslmode=require' }).msg).toBe(
      'at postgres://user:[redacted]@host:5432/db?sslmode=require',
    )
  })
})
