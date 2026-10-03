import 'server-only'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { getEnv } from '@/lib/env'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>

const POOL_MAX = 5
const CONNECT_TIMEOUT_MS = 5_000

type Holder = { pool?: pg.Pool; db?: Db }
// Survives dev-server hot reloads so we never leak pools.
const holder = globalThis as typeof globalThis & { __stewardDb?: Holder }

/** The shared Drizzle client over a small pg pool (max 5, PLAN section 4). */
export function getDb(): Db {
  const state = (holder.__stewardDb ??= {})
  if (!state.db) {
    state.pool = new pg.Pool({
      connectionString: getEnv().DATABASE_URL,
      max: POOL_MAX,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    })
    state.db = drizzle(state.pool, { schema })
  }
  return state.db
}

export { schema }
