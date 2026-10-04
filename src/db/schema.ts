import { sql } from 'drizzle-orm'
import {
  bigserial,
  check,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

/**
 * One row per signed-in browser session; only a hash of the session id is stored. Route handlers
 * accept a cookie only while its row exists, is unexpired and carries the current passcode
 * generation, so sign-out and a passcode change both take effect server-side.
 */
export const sessions = pgTable('sessions', {
  idHash: text('id_hash').primaryKey(),
  tokensUsed: integer('tokens_used').notNull().default(0),
  /** Tag of the DEMO_PASSCODE this session was issued under (see lib/auth passcodeGeneration). */
  passcodeGen: text('passcode_gen').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

/** Fixed-window request counters (passcode attempts, per-route limits). */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
)

/** The single shared-demo row: current epoch and Reset/top-up counters (PLAN section 5). */
export const demoState = pgTable(
  'demo_state',
  {
    id: integer('id').primaryKey().default(1),
    epoch: integer('epoch').notNull().default(1),
    lastResetAt: timestamp('last_reset_at', { withTimezone: true }),
    resetsToday: integer('resets_today').notNull().default(0),
    topupsToday: integer('topups_today').notNull().default(0),
  },
  (t) => [check('demo_state_singleton', sql`${t.id} = 1`)],
)

/** Per-day model spend totals the guard reserves against and settles into (used from 0.1e). */
export const spendDays = pgTable('spend_days', {
  day: date('day').primaryKey(),
  reservedUsd: numeric('reserved_usd', { precision: 12, scale: 6 }).notNull().default('0'),
  spentUsd: numeric('spent_usd', { precision: 12, scale: 6 }).notNull().default('0'),
})

export const SPEND_SCOPES = ['demo', 'eval', 'dev'] as const

/**
 * Append-only model spend ledger (R34). A trigger rejects UPDATE, DELETE and TRUNCATE, so the
 * spend history cannot be rewritten by the app or by the least-privilege `steward_eval` role.
 */
export const apiSpend = pgTable(
  'api_spend',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    scope: text('scope', { enum: SPEND_SCOPES }).notNull(),
    runId: text('run_id').notNull(),
    callId: text('call_id').notNull(),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('api_spend_run_call_unique').on(t.runId, t.callId),
    check(
      'api_spend_scope_valid',
      sql`${t.scope} IN (${sql.raw(SPEND_SCOPES.map((scope) => `'${scope}'`).join(', '))})`,
    ),
    check('api_spend_cost_nonnegative', sql`${t.costUsd} >= 0`),
  ],
)
