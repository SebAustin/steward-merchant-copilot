import { describe, expect, it } from 'vitest'
import { errorMessage } from './client'
import { MESSAGES } from './messages'

describe('errorMessage', () => {
  it('shows the server message as received', async () => {
    const res = Response.json(
      { error: { code: 'login_rate_limited', message: MESSAGES.login_rate_limited } },
      { status: 429 },
    )

    expect(await errorMessage(res)).toBe(MESSAGES.login_rate_limited)
  })

  it('falls back to the generic message for a body that is not our error shape', async () => {
    expect(await errorMessage(new Response('<html>502</html>', { status: 502 }))).toBe(
      MESSAGES.unavailable,
    )
    expect(await errorMessage(Response.json({ error: {} }))).toBe(MESSAGES.unavailable)
  })
})
