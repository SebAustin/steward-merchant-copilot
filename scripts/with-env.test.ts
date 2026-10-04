import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('./with-env.sh', import.meta.url))

/** Run `printenv NAME` through with-env.sh with the given file content and base environment. */
function read(content: string, name: string, base: Record<string, string> = {}): string {
  const file = join(mkdtempSync(join(tmpdir(), 'withenv-')), 'env')
  writeFileSync(file, content)
  const result = spawnSync('bash', [SCRIPT, file, 'printenv', name], {
    env: { PATH: process.env.PATH ?? '', ...base },
    encoding: 'utf8',
  })
  return result.stdout.replace(/\n$/, '')
}

describe('with-env.sh', () => {
  it('keeps everything after the first = in the value', () => {
    expect(read('URL=postgres://u:p@h/db?a=1&b=2=\n', 'URL')).toBe('postgres://u:p@h/db?a=1&b=2=')
  })

  it('reads the last line even without a trailing newline', () => {
    expect(read('A=1\nLAST=end', 'LAST')).toBe('end')
  })

  it('strips carriage returns from Windows line endings', () => {
    expect(read('A=1\r\nB=two\r\n', 'B')).toBe('two')
  })

  it('skips comments and blank lines', () => {
    expect(read('# NOTE=hidden\n\n   \nVISIBLE=yes\n', 'VISIBLE')).toBe('yes')
    expect(read('# NOTE=hidden\nOTHER=1\n', 'NOTE')).toBe('')
  })

  it('lets a variable already in the environment win over the file', () => {
    expect(read('DATABASE_URL=from-file\n', 'DATABASE_URL', { DATABASE_URL: 'from-env' })).toBe(
      'from-env',
    )
  })
})
