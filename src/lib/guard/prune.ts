import { lt } from 'drizzle-orm'
import { rateLimits, sessions } from '@/db/schema'
import type { Db } from '@/db/types'

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000
const DEFAULT_PROBABILITY = 0.05

export type PruneResult = Readonly<{ rateLimits: number; sessions: number }>

/**
 * Delete rate-limit windows older than a day and expired sessions so neither table grows without
 * bound. Runs opportunistically after logins now; slice 0.2b moves it into `cron/tick`.
 */
export async function pruneExpired(db: Db, now: number = Date.now()): Promise<PruneResult> {
  const [limitRows, sessionRows] = await Promise.all([
    db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(now - RATE_LIMIT_RETENTION_MS)))
      .returning({ key: rateLimits.key }),
    db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date(now)))
      .returning({ id: sessions.idHash }),
  ])
  return { rateLimits: limitRows.length, sessions: sessionRows.length }
}

type MaybePruneOptions = Readonly<{ random?: () => number; probability?: number }>

/** {@link pruneExpired} on a small random fraction of calls; null when it did not run. */
export async function maybePrune(
  db: Db,
  { random = Math.random, probability = DEFAULT_PROBABILITY }: MaybePruneOptions = {},
): Promise<PruneResult | null> {
  return random() < probability ? pruneExpired(db) : null
}
