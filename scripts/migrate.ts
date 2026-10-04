import { runMigrations } from '../src/db/migrate.ts'

const url = process.env.DATABASE_URL
if (!url) {
  process.stderr.write('migrate: DATABASE_URL is not set\n')
  process.exit(1)
}

try {
  await runMigrations(url)
  process.stdout.write('migrate: up to date\n')
} catch (error) {
  process.stderr.write(
    `migrate: failed: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
}
