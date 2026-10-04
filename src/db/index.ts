import 'server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { getEnv } from '@/lib/env'
import { log } from '@/lib/log'
import * as schema from './schema'
import type { Db } from './types'

export type { Db }

const POOL_MAX = 5
const CONNECT_TIMEOUT_MS = 5_000
const STATEMENT_TIMEOUT_MS = 5_000
const QUERY_TIMEOUT_MS = 6_000

type Holder = { pool?: pg.Pool; db?: Db }
// Survives dev-server hot reloads so we never leak pools.
const holder = globalThis as typeof globalThis & { __stewardDb?: Holder }

/**
 * The shared Drizzle client over a small pg pool (max 5, PLAN section 4). Every statement is
 * bounded (server-side 5 s, client-side 6 s) so a stalled database cannot hang a request, and TCP
 * keepalive notices connections that a proxy silently dropped.
 */
export function getDb(): Db {
  const state = (holder.__stewardDb ??= {})
  if (!state.db) {
    const pool = new pg.Pool({
      connectionString: getEnv().DATABASE_URL,
      max: POOL_MAX,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      statement_timeout: STATEMENT_TIMEOUT_MS,
      query_timeout: QUERY_TIMEOUT_MS,
      keepAlive: true,
    })
    // An idle client erroring (e.g. Postgres restarting) would otherwise crash the process.
    pool.on('error', (error) => log.warn({ error }, 'idle database client error'))
    state.pool = pool
    state.db = drizzle(pool, { schema })
  }
  return state.db
}
