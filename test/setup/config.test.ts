import { describe, expect, it } from 'vitest'
import { assertSafeTestDatabase } from './config'

const url = (host: string, db: string) => `postgres://u:p@${host}:5432/${db}`

describe('assertSafeTestDatabase (global setup drops the public schema)', () => {
  it('accepts a local database whose name ends in _test', () => {
    expect(assertSafeTestDatabase(url('localhost', 'steward_test'), {})).toContain('steward_test')
    expect(assertSafeTestDatabase(url('127.0.0.1', 'x_test'), {})).toContain('x_test')
  })

  it('refuses a database that is not named *_test, even locally', () => {
    expect(() => assertSafeTestDatabase(url('localhost', 'steward'), {})).toThrow(/_test/)
    expect(() => assertSafeTestDatabase(url('localhost', 'steward_test_backup'), {})).toThrow(
      /_test/,
    )
  })

  it('refuses a remote host unless running in CI', () => {
    expect(() => assertSafeTestDatabase(url('db.example.com', 'steward_test'), {})).toThrow(
      /localhost/,
    )
    expect(assertSafeTestDatabase(url('postgres', 'steward_test'), { CI: 'true' })).toContain(
      'postgres',
    )
  })
})
