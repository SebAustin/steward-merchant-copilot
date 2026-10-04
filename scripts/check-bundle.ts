// Fails the build when a server secret appears in the client bundle (SC-15). Run after `next build`.
import { existsSync } from 'node:fs'
import { findLeaks } from './lib/bundle-scan.ts'

const CLIENT_BUNDLE = '.next/static'
const SECRET_VARIABLES = [
  'SESSION_SECRET',
  'DEMO_PASSCODE',
  'CRON_SECRET',
  'DATABASE_URL',
  'EVAL_DATABASE_URL',
  'PAYPAL_CLIENT_SECRET',
  'ANTHROPIC_API_KEY',
] as const

if (!existsSync(CLIENT_BUNDLE)) {
  process.stderr.write(`check-bundle: ${CLIENT_BUNDLE} not found; run "pnpm build" first\n`)
  process.exit(1)
}

const needles = Object.fromEntries(SECRET_VARIABLES.map((name) => [name, process.env[name]]))
const leaks = findLeaks(CLIENT_BUNDLE, needles)

if (leaks.length > 0) {
  for (const leak of leaks)
    process.stderr.write(`check-bundle: ${leak.label} found in ${leak.file}\n`)
  process.exit(1)
}
process.stdout.write('check-bundle: no server secret in the client bundle\n')
