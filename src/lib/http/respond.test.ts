import { describe, expect, it } from 'vitest'
import { MESSAGES } from './messages'
import { jsonError } from './respond'

describe('jsonError', () => {
  it('sends the code, the shared message and the request id, and echoes the id in a header', async () => {
    const res = jsonError({ status: 429, code: 'login_rate_limited', requestId: 'req-1' })

    expect(res.status).toBe(429)
    expect(res.headers.get('x-request-id')).toBe('req-1')
    expect(await res.json()).toEqual({
      error: {
        code: 'login_rate_limited',
        message: MESSAGES.login_rate_limited,
        requestId: 'req-1',
      },
    })
  })

  it('passes extra headers through, such as Retry-After', () => {
    const res = jsonError({
      status: 429,
      code: 'rate_limited',
      requestId: 'r',
      headers: { 'retry-after': '30' },
    })

    expect(res.headers.get('retry-after')).toBe('30')
  })
})
