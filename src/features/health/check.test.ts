import { describe, expect, it } from 'vitest'
import { checkHealth, isHealthy } from './check'

describe('checkHealth', () => {
  it('reports the database as up and skips checks that have no credentials yet', async () => {
    const report = await checkHealth({ pingDb: async () => {} })

    expect(report).toEqual({ db: true, paypal: 'skipped', model: 'skipped' })
    expect(isHealthy(report)).toBe(true)
  })

  it('reports the database as down when the ping fails, without leaking the error', async () => {
    const report = await checkHealth({
      pingDb: async () => {
        throw new Error('connect ECONNREFUSED postgres://user:hunter2@db:5432/steward')
      },
    })

    expect(report.db).toBe(false)
    expect(isHealthy(report)).toBe(false)
    expect(JSON.stringify(report)).not.toContain('hunter2')
  })

  it('treats a hung database as down once the timeout passes', async () => {
    const hang = () => new Promise<void>(() => {})

    const report = await checkHealth({ pingDb: hang, timeoutMs: 20 })

    expect(report.db).toBe(false)
  })
})

describe('isHealthy', () => {
  it('fails on any explicit false but not on skipped', () => {
    expect(isHealthy({ db: true, paypal: false, model: 'skipped' })).toBe(false)
    expect(isHealthy({ db: true, paypal: 'skipped', model: true })).toBe(true)
  })
})
