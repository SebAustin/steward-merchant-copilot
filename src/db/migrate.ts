import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

// Self-contained on purpose: scripts/migrate.ts runs it under plain Node, without the `@/` alias.
const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url))

/** Apply every pending SQL migration, then close the connection. Safe to re-run. */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await pool.end()
  }
}
