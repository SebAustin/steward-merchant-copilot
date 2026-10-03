import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '../../src/db/schema'

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://steward:steward@localhost:54329/steward_test'

/** A pool on the migrated test database. Callers must `await pool.end()` in afterAll. */
export function testPool(connectionString = TEST_DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString, max: 5 })
}

export const testDb = (pool: pg.Pool) => drizzle(pool, { schema })

/** Unique id so test files can share one database without truncating append-only tables. */
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
