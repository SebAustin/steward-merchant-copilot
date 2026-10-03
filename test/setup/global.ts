import pg from 'pg'
import { runMigrations } from '../../src/db/migrate'

const DEFAULT_URL = 'postgres://steward:steward@localhost:54329/steward_test'

/** Fresh schema + all migrations once per test run, against a real Postgres (PLAN T7). */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_URL
  const pool = new pg.Pool({ connectionString: url, max: 1 })
  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE;')
    await pool.query('CREATE SCHEMA public')
  } catch (error) {
    throw new Error(
      `Test database unreachable at ${new URL(url).host}. Run "pnpm db:up" first. ` +
        `(${error instanceof Error ? error.message : String(error)})`,
    )
  } finally {
    await pool.end()
  }
  await runMigrations(url)
}
