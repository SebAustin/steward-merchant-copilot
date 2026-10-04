import { afterAll, describe, expect, it } from 'vitest'
import { testDb, testPool, uid } from '../../../test/setup/db'
import { maybePrune, pruneExpired } from './prune'

const pool = testPool()
const db = testDb(pool)
afterAll(() => pool.end())

const LONG_AGO = '2000-01-01T00:00:00Z'
const count = async (table: string, column: string, value: string) =>
  (await pool.query(`SELECT 1 FROM ${table} WHERE ${column} = $1`, [value])).rowCount

async function seed() {
  const [oldKey, freshKey, expiredSid, liveSid] = [
    uid('old'),
    uid('fresh'),
    uid('exp'),
    uid('live'),
  ]
  await pool.query(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $3, 1), ($2, now(), 1)`,
    [oldKey, freshKey, LONG_AGO],
  )
  await pool.query(
    `INSERT INTO sessions (id_hash, passcode_gen, expires_at) VALUES
       ($1, 'g', $3), ($2, 'g', now() + interval '1 hour')`,
    [expiredSid, liveSid, LONG_AGO],
  )
  return { oldKey, freshKey, expiredSid, liveSid }
}

describe('pruneExpired', () => {
  it('deletes stale rate-limit windows and expired sessions, and keeps current ones', async () => {
    const rows = await seed()

    const result = await pruneExpired(db)

    expect(result.rateLimits).toBeGreaterThanOrEqual(1)
    expect(result.sessions).toBeGreaterThanOrEqual(1)
    expect(await count('rate_limits', 'key', rows.oldKey)).toBe(0)
    expect(await count('rate_limits', 'key', rows.freshKey)).toBe(1)
    expect(await count('sessions', 'id_hash', rows.expiredSid)).toBe(0)
    expect(await count('sessions', 'id_hash', rows.liveSid)).toBe(1)
  })
})

describe('maybePrune', () => {
  it('prunes only when the dice roll lands under the probability', async () => {
    const rows = await seed()

    expect(await maybePrune(db, { random: () => 0.9, probability: 0.05 })).toBeNull()
    expect(await count('sessions', 'id_hash', rows.expiredSid)).toBe(1)

    expect(await maybePrune(db, { random: () => 0.01, probability: 0.05 })).not.toBeNull()
    expect(await count('sessions', 'id_hash', rows.expiredSid)).toBe(0)
  })
})
