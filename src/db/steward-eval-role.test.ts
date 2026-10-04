import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL, testPool, uid } from '../../test/setup/db'

// A role per run keeps parallel or aborted runs from colliding on a cluster-wide name.
const ROLE = `steward_eval_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
const GRANTS = readFileSync(
  fileURLToPath(new URL('../../scripts/sql/steward_eval_grants.sql', import.meta.url)),
  'utf8',
).replaceAll('steward_eval', ROLE)
const PASSWORD = uid('pw')

const admin = testPool()
let evalPool: ReturnType<typeof testPool>

beforeAll(async () => {
  // The owner creates the role (with a real password) once; the grants script is idempotent.
  await admin.query(`CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASSWORD}'`)
  await admin.query(GRANTS)
  await admin.query(GRANTS)

  const url = new URL(TEST_DATABASE_URL)
  url.username = ROLE
  url.password = PASSWORD
  evalPool = testPool(url.toString())
})

afterAll(async () => {
  await evalPool.end()
  await admin.query(`DROP OWNED BY ${ROLE}; DROP ROLE ${ROLE}`)
  await admin.end()
})

describe('steward_eval role (R34)', () => {
  it('can append to and read the spend ledger', async () => {
    const runId = uid('eval')

    await evalPool.query(
      "INSERT INTO api_spend (scope, run_id, call_id, cost_usd) VALUES ('eval', $1, 'c1', '0.5')",
      [runId],
    )
    const { rows } = await evalPool.query('SELECT cost_usd FROM api_spend WHERE run_id = $1', [
      runId,
    ])

    expect(rows).toEqual([{ cost_usd: '0.500000' }])
  })

  it('cannot update, delete or truncate the ledger', async () => {
    await expect(evalPool.query("UPDATE api_spend SET cost_usd = '0'")).rejects.toThrow(
      /permission denied/,
    )
    await expect(evalPool.query('DELETE FROM api_spend')).rejects.toThrow(/permission denied/)
    await expect(evalPool.query('TRUNCATE api_spend')).rejects.toThrow(/permission denied/)
  })

  it('cannot touch any other table', async () => {
    for (const table of ['sessions', 'rate_limits', 'demo_state', 'spend_days']) {
      await expect(evalPool.query(`SELECT 1 FROM ${table}`)).rejects.toThrow(/permission denied/)
    }
  })
})
