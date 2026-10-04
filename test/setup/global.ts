import pg from 'pg'
import { runMigrations } from '../../src/db/migrate'
import { TEST_DATABASE_URL } from './config'

/** Fresh schema + all migrations once per test run, against a real Postgres (PLAN T7). */
export default async function setup() {
  const url = TEST_DATABASE_URL
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
