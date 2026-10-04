// Fails the boot with the names of missing or invalid variables (never their values).
// Runs from scripts/start.sh before migrations, so a bad deploy stops here with a clear message.
import { parseEnv } from '../src/lib/env/parse.ts'

try {
  parseEnv(process.env)
  process.stdout.write('check-env: environment is valid\n')
} catch (error) {
  process.stderr.write(`check-env: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
