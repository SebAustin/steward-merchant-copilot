import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import pg from 'pg'
import { TEST_DATABASE_URL, testPool } from '../../test/setup/db'
import { runMigrations } from './migrate'

const admin = testPool()
const scratchName = `steward_migrate_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}_test`
const scratchUrl = () => {
  const url = new URL(TEST_DATABASE_URL)
  url.pathname = `/${scratchName}`
  return url.toString()
}

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${scratchName}`)
})

afterAll(async () => {
  await admin.query(`DROP DATABASE IF EXISTS ${scratchName} WITH (FORCE)`)
  await admin.end()
})

describe('runMigrations', () => {
  it('applies every migration to an empty database, and again with nothing to do', async () => {
    await runMigrations(scratchUrl())
    await runMigrations(scratchUrl())

    const probe = new pg.Client({ connectionString: scratchUrl() })
    await probe.connect()
    const { rows } = await probe.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'api_spend'",
    )
    await probe.end()
    expect(rows[0].n).toBe(1)
  })

  it('lets concurrent deploys race safely: the advisory lock serialises them', async () => {
    const racing = `${scratchName.slice(0, -5)}r_test`
    await admin.query(`CREATE DATABASE ${racing}`)
    const url = new URL(TEST_DATABASE_URL)
    url.pathname = `/${racing}`

    try {
      await expect(
        Promise.all(Array.from({ length: 4 }, () => runMigrations(url.toString()))),
      ).resolves.toBeDefined()
    } finally {
      await admin.query(`DROP DATABASE IF EXISTS ${racing} WITH (FORCE)`)
    }
  })

  it('retries connection failures with backoff, then gives up', async () => {
    const attempts: number[] = []
    const closedPort = 'postgres://u:p@127.0.0.1:1/x'

    await expect(
      runMigrations(closedPort, {
        retries: 3,
        baseDelayMs: 1,
        onRetry: (attempt) => attempts.push(attempt),
      }),
    ).rejects.toThrow(/ECONNREFUSED/)

    expect(attempts).toEqual([1, 2, 3])
  })

  it('does not retry an error that is not a connection failure', async () => {
    const attempts: number[] = []
    const badPassword = new URL(TEST_DATABASE_URL)
    badPassword.password = 'definitely-wrong'

    await expect(
      runMigrations(badPassword.toString(), {
        retries: 3,
        baseDelayMs: 1,
        onRetry: (attempt) => attempts.push(attempt),
      }),
    ).rejects.toThrow()

    expect(attempts).toEqual([])
  })
})
