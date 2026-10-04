import { and, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { rateLimits } from '@/db/schema'

export type RateLimitResult = Readonly<{
  allowed: boolean
  remaining: number
  /** Seconds until the current window ends; only meaningful when `allowed` is false. */
  retryAfterSec: number
  /** Start of the counting window (epoch ms); pass it to {@link refundRateLimit}. */
  windowStart: number
}>

export type RateLimitInput = Readonly<{
  key: string
  limit: number
  windowSec: number
  /** Epoch milliseconds; injectable for tests. */
  now?: number
}>

/**
 * Fixed-window counter in Postgres (PLAN T6). The increment is one atomic upsert, so concurrent
 * requests cannot lose updates. Throws if the database is unreachable: callers must fail closed.
 */
export async function rateLimit(
  // The schema generic is irrelevant here: only the rate_limits table is touched.
  db: Db,
  { key, limit, windowSec, now = Date.now() }: RateLimitInput,
): Promise<RateLimitResult> {
  const windowMs = windowSec * 1000
  const windowStartMs = Math.floor(now / windowMs) * windowMs

  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(windowStartMs), count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })

  const count = row?.count ?? limit + 1
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: Math.ceil((windowStartMs + windowMs - now) / 1000),
    windowStart: windowStartMs,
  }
}

type Db = NodePgDatabase<Record<string, unknown>>

/** Give one attempt back (never below zero), e.g. when a login succeeded after being counted. */
export async function refundRateLimit(
  db: Db,
  { key, windowStart }: Readonly<{ key: string; windowStart: number }>,
): Promise<void> {
  await db
    .update(rateLimits)
    .set({ count: sql`GREATEST(${rateLimits.count} - 1, 0)` })
    .where(and(eq(rateLimits.key, key), eq(rateLimits.windowStart, new Date(windowStart))))
}
