import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import { createSessionId, signSession } from './session'

const SECRET = 'page-test-secret-0123456789-abcdefghij'
const cookieJar = new Map<string, string>()
const warn = vi.fn()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}))
vi.mock('@/lib/log', () => ({ log: { warn, info: vi.fn(), error: vi.fn() } }))

const { AuthUnavailableError, hasPageSession, requirePageSession } = await import('./index')

// Nothing listens on port 1: every query fails with ECONNREFUSED.
const deadPool = new pg.Pool({ connectionString: 'postgres://u:p@127.0.0.1:1/steward_test' })
const deps = {
  db: drizzle(deadPool, { schema }),
  env: { SESSION_SECRET: SECRET, DEMO_PASSCODE: 'espresso-2026', NODE_ENV: 'production' as const },
}
afterAll(() => deadPool.end())

beforeEach(() => {
  cookieJar.clear()
  warn.mockClear()
})

const signedCookie = () =>
  signSession({ sid: createSessionId(), now: Date.now(), ttlMs: 60_000 }, SECRET)

describe('page session checks with the database down', () => {
  it('hasPageSession answers false and logs a warning with a request id, so /enter still renders', async () => {
    cookieJar.set('steward_session', signedCookie())

    expect(await hasPageSession(deps)).toBe(false)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ requestId: expect.any(String) })
  })

  it('requirePageSession throws a typed unavailable error instead of a bare failure', async () => {
    cookieJar.set('steward_session', signedCookie())

    await expect(requirePageSession(deps)).rejects.toBeInstanceOf(AuthUnavailableError)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('still redirects (not the unavailable error) when there is no cookie at all', async () => {
    const outcome = await requirePageSession(deps).catch((error: unknown) => error)

    expect(outcome).not.toBeInstanceOf(AuthUnavailableError)
    expect((outcome as { digest?: string }).digest).toMatch(/^NEXT_REDIRECT/)
    expect(warn).not.toHaveBeenCalled()
  })
})
