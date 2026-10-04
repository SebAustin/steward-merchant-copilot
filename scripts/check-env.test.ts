import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('./check-env.ts', import.meta.url))

function run(env: Record<string, string>) {
  return spawnSync(process.execPath, [SCRIPT], {
    env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test', ...env },
    encoding: 'utf8',
  })
}

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  DEMO_PASSCODE: 'espresso-2026',
  SESSION_SECRET: 'x'.repeat(40),
}

describe('check-env', () => {
  it('exits 0 for a valid environment', () => {
    expect(run(valid).status).toBe(0)
  })

  it('exits 1 and names every missing or invalid variable, without printing values', () => {
    const result = run({ SESSION_SECRET: 'too-short-secret', DISPUTE_SOURCE: 'bogus-source' })

    expect(result.status).toBe(1)
    for (const name of ['DATABASE_URL', 'DEMO_PASSCODE', 'SESSION_SECRET', 'DISPUTE_SOURCE']) {
      expect(result.stderr).toContain(name)
    }
    expect(result.stderr).not.toContain('too-short-secret')
    expect(result.stderr).not.toContain('bogus-source')
  })
})
