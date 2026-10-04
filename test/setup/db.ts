import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../../src/db/schema'

import { TEST_DATABASE_URL } from './config'

export { TEST_DATABASE_URL }

/** A pool on the migrated test database. Callers must `await pool.end()` in afterAll. */
export function testPool(connectionString = TEST_DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString, max: 5 })
}

export const testDb = (pool: pg.Pool) => drizzle(pool, { schema })

/** Unique id so test files can share one database without truncating append-only tables. */
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

const hex16 = () => Math.floor(Math.random() * 0x10000).toString(16)

/** A random IPv6 address in the documentation range; each one lands in its own /64 rate-limit bucket. */
export const randomIp = () => `2001:db8:${hex16()}:${hex16()}::1`
