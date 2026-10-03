import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findLeaks } from './bundle-scan.ts'

function bundleWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content)
  }
  return dir
}

describe('findLeaks', () => {
  it('reports the file and label when a secret value reaches the client bundle', () => {
    const dir = bundleWith({
      'chunks/app.js': 'const a="ok";const k="s3cr3t-value-123";',
      'chunks/other.js': 'nothing here',
    })

    const leaks = findLeaks(dir, { SESSION_SECRET: 's3cr3t-value-123' })

    expect(leaks).toEqual([{ label: 'SESSION_SECRET', file: 'chunks/app.js' }])
  })

  it('finds leaks in nested directories and reports each file once per label', () => {
    const dir = bundleWith({
      'a/b/c.js': 'xx-leak-xx xx-leak-xx',
      'd.css': 'xx-leak-xx',
    })

    const files = findLeaks(dir, { TOKEN: 'xx-leak-xx' }).map((l) => l.file)

    expect(files.sort()).toEqual(['a/b/c.js', 'd.css'])
  })

  it('returns nothing for a clean bundle and ignores empty or too-short values', () => {
    const dir = bundleWith({ 'x.js': 'abc function(){}' })

    expect(findLeaks(dir, { SECRET: 'not-present-here', EMPTY: '', SHORT: 'abc' })).toEqual([])
  })
})
