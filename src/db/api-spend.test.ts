import { afterAll, describe, expect, it } from 'vitest'
import { testPool, uid } from '../../test/setup/db'

const pool = testPool()
afterAll(() => pool.end())

async function insertSpend(
  overrides: { scope?: string; cost?: string; run?: string; call?: string } = {},
) {
  const runId = overrides.run ?? uid('run')
  await pool.query(
    'INSERT INTO api_spend (scope, run_id, call_id, cost_usd) VALUES ($1, $2, $3, $4)',
    [overrides.scope ?? 'demo', runId, overrides.call ?? 'call-1', overrides.cost ?? '0.012345'],
  )
  return runId
}

describe('api_spend ledger', () => {
  it('records a settled call and reads it back', async () => {
    const runId = await insertSpend({ scope: 'eval', cost: '1.500000' })

    const { rows } = await pool.query('SELECT scope, cost_usd FROM api_spend WHERE run_id = $1', [
      runId,
    ])

    expect(rows).toEqual([{ scope: 'eval', cost_usd: '1.500000' }])
  })

  it('refuses to rewrite history with UPDATE', async () => {
    const runId = await insertSpend()

    await expect(
      pool.query("UPDATE api_spend SET cost_usd = '0' WHERE run_id = $1", [runId]),
    ).rejects.toThrow(/append-only/)
  })

  it('refuses to erase history with DELETE or TRUNCATE', async () => {
    const runId = await insertSpend()

    await expect(pool.query('DELETE FROM api_spend WHERE run_id = $1', [runId])).rejects.toThrow(
      /append-only/,
    )
    await expect(pool.query('TRUNCATE api_spend')).rejects.toThrow(/append-only/)
    const { rowCount } = await pool.query('SELECT 1 FROM api_spend WHERE run_id = $1', [runId])
    expect(rowCount).toBe(1)
  })

  it('rejects a second row for the same call (settle is exactly-once)', async () => {
    const runId = await insertSpend({ call: 'dup' })

    await expect(insertSpend({ run: runId, call: 'dup' })).rejects.toThrow(/unique/i)
  })

  it('rejects unknown scopes and negative costs', async () => {
    await expect(insertSpend({ scope: 'prod' })).rejects.toThrow(/api_spend_scope_valid/)
    await expect(insertSpend({ cost: '-0.01' })).rejects.toThrow(/api_spend_cost_nonnegative/)
  })
})
