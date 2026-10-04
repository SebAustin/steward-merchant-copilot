import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

// Self-contained on purpose: scripts/migrate.ts runs it under plain Node, without the `@/` alias.
const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url))

const CONNECT_TIMEOUT_MS = 5_000
const LOCK_TIMEOUT = '5s'
const STATEMENT_TIMEOUT = '60s'
/** Arbitrary constant shared by every migrator instance ("stwd" in hex). */
const MIGRATION_LOCK_KEY = 0x73747764
/** Network-level failures worth retrying while the database starts up or restarts. */
const RETRYABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  '57P03', // cannot_connect_now: the database system is starting up
  '08000',
  '08001',
  '08006',
])

export type MigrateOptions = Readonly<{
  /** Extra connection attempts after the first (default 4). */
  retries?: number
  /** First backoff delay; doubles each attempt (default 1000 ms). */
  baseDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}>

const isRetryable = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && RETRYABLE_CODES.has(code)) return true
  // pg wraps a connect timeout in a plain Error without a code.
  return error instanceof Error && /timeout exceeded when trying to connect/i.test(error.message)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function connect(connectionString: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: CONNECT_TIMEOUT_MS })
  // Without a listener an error on an idle client would crash the process with no context.
  client.on('error', (error) =>
    process.stderr.write(`migrate: connection error: ${error.message}\n`),
  )
  await client.connect()
  return client
}

async function connectWithRetry(url: string, options: MigrateOptions): Promise<pg.Client> {
  const { retries = 4, baseDelayMs = 1_000, onRetry } = options
  for (let attempt = 1; ; attempt++) {
    try {
      return await connect(url)
    } catch (error) {
      if (attempt > retries || !isRetryable(error)) throw error
      onRetry?.(attempt, error as Error)
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
}

/**
 * Apply every pending SQL migration. Safe to re-run and safe to run from two instances at once:
 * a session advisory lock serialises them, and lock/statement timeouts keep a stuck migration
 * from hanging a deploy. Connection errors are retried with backoff; anything else fails fast.
 */
export async function runMigrations(
  connectionString: string,
  options: MigrateOptions = {},
): Promise<void> {
  const client = await connectWithRetry(connectionString, options)
  try {
    // Waiting for another instance's migration may take a while; only DDL gets the short lock timeout.
    await client.query(`SET statement_timeout = '${STATEMENT_TIMEOUT}'`)
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY])
    await client.query(`SET lock_timeout = '${LOCK_TIMEOUT}'`)
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await client.end()
  }
}
