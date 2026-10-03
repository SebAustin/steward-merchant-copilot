import { afterAll, describe, expect, it } from 'vitest'
import { testDb, testPool, uid } from '../../../test/setup/db'
import { rateLimit } from './rate-limit'

const pool = testPool()
const db = testDb(pool)
afterAll(() => pool.end())

const T0 = Date.UTC(2026, 9, 5, 12, 0, 0)
const WINDOW_SEC = 600

describe('rateLimit', () => {
  it('allows up to the limit, then refuses with a retry-after', async () => {
    const key = uid('login')
    const results = []
    for (let i = 0; i < 6; i++) {
      results.push(
        await rateLimit(db, { key, limit: 5, windowSec: WINDOW_SEC, now: T0 + i * 1000 }),
      )
    }

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false])
    expect(results[4]?.remaining).toBe(0)
    expect(results[5]?.retryAfterSec).toBe(WINDOW_SEC - 5)
  })

  it('counts each key separately', async () => {
    const a = uid('ip-a')
    const b = uid('ip-b')
    for (let i = 0; i < 3; i++) await rateLimit(db, { key: a, limit: 3, windowSec: 60, now: T0 })

    expect((await rateLimit(db, { key: a, limit: 3, windowSec: 60, now: T0 })).allowed).toBe(false)
    expect((await rateLimit(db, { key: b, limit: 3, windowSec: 60, now: T0 })).allowed).toBe(true)
  })

  it('starts a fresh allowance in the next window', async () => {
    const key = uid('window')
    for (let i = 0; i < 2; i++) await rateLimit(db, { key, limit: 2, windowSec: 60, now: T0 })
    expect((await rateLimit(db, { key, limit: 2, windowSec: 60, now: T0 + 59_000 })).allowed).toBe(
      false,
    )

    const later = await rateLimit(db, { key, limit: 2, windowSec: 60, now: T0 + 60_000 })

    expect(later.allowed).toBe(true)
  })

  it('stays exact under 20 concurrent attempts (no lost updates)', async () => {
    const key = uid('burst')

    const results = await Promise.all(
      Array.from({ length: 20 }, () => rateLimit(db, { key, limit: 5, windowSec: 60, now: T0 })),
    )

    expect(results.filter((r) => r.allowed)).toHaveLength(5)
  })
})
