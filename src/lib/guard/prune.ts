import { sql } from 'drizzle-orm'
import type { Db } from '@/db/types'

/** The longest limiter window is one hour (successful logins), so two hours is window + margin. */
const RATE_LIMIT_RETENTION_MS = 2 * 60 * 60 * 1000
const DEFAULT_BATCH_SIZE = 5_000
const DEFAULT_PROBABILITY = 0.05

export type PruneResult = Readonly<{ rateLimits: number; sessions: number }>

type PruneOptions = Readonly<{ now?: number; batchSize?: number }>

/**
 * Delete rate-limit windows past their retention and expired sessions so neither table grows
 * without bound, even when a client rotates addresses. At most `batchSize` rows per table per
 * call, so one request never does unbounded work; repeated calls drain a backlog. Runs
 * opportunistically from the route limiter now; slice 0.2b adds it to `cron/tick`.
 */
export async function pruneExpired(
  db: Db,
  { now = Date.now(), batchSize = DEFAULT_BATCH_SIZE }: PruneOptions = {},
): Promise<PruneResult> {
  const limitCutoff = new Date(now - RATE_LIMIT_RETENTION_MS).toISOString()
  const sessionCutoff = new Date(now).toISOString()
  const [limitRows, sessionRows] = await Promise.all([
    db.execute(sql`
      DELETE FROM rate_limits WHERE ctid IN (
        SELECT ctid FROM rate_limits WHERE window_start < ${limitCutoff}::timestamptz LIMIT ${batchSize})`),
    db.execute(sql`
      DELETE FROM sessions WHERE ctid IN (
        SELECT ctid FROM sessions WHERE expires_at < ${sessionCutoff}::timestamptz LIMIT ${batchSize})`),
  ])
  return { rateLimits: limitRows.rowCount ?? 0, sessions: sessionRows.rowCount ?? 0 }
}

type MaybePruneOptions = Readonly<{ random?: () => number; probability?: number }>

/** {@link pruneExpired} on a small random fraction of calls; null when it did not run. */
export async function maybePrune(
  db: Db,
  { random = Math.random, probability = DEFAULT_PROBABILITY }: MaybePruneOptions = {},
): Promise<PruneResult | null> {
  return random() < probability ? pruneExpired(db) : null
}
