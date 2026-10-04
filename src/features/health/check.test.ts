import { describe, expect, it } from 'vitest'
import { checkHealth, createCachedHealth, isHealthy, type HealthReport } from './check'

describe('checkHealth', () => {
  it('reports the database as up and lists checks that have no credentials yet as skipped', async () => {
    const report = await checkHealth({ pingDb: async () => {} })

    expect(report).toEqual({ checks: { db: true }, skipped: ['paypal', 'model'] })
    expect(isHealthy(report)).toBe(true)
  })

  it('reports the database as down when the ping fails, without leaking the error', async () => {
    const report = await checkHealth({
      pingDb: async () => {
        throw new Error('connect ECONNREFUSED postgres://user:hunter2@db:5432/steward')
      },
    })

    expect(report.checks.db).toBe(false)
    expect(isHealthy(report)).toBe(false)
    expect(JSON.stringify(report)).not.toContain('hunter2')
  })

  it('treats a hung database as down once the timeout passes', async () => {
    const report = await checkHealth({ pingDb: () => new Promise<void>(() => {}), timeoutMs: 20 })

    expect(report.checks.db).toBe(false)
  })

  it('calls the failure hook so the cause can be logged elsewhere', async () => {
    const seen: unknown[] = []
    await checkHealth({
      pingDb: async () => {
        throw new Error('boom')
      },
      onError: (error) => seen.push(error),
    })

    expect(seen).toHaveLength(1)
  })
})

describe('createCachedHealth', () => {
  const up: HealthReport = { checks: { db: true }, skipped: [] }
  const down: HealthReport = { checks: { db: false }, skipped: [] }

  function harness(reports: HealthReport[]) {
    let now = 0
    let calls = 0
    const get = createCachedHealth(async () => reports[Math.min(calls++, reports.length - 1)]!, {
      now: () => now,
    })
    return { get, advance: (ms: number) => (now += ms), calls: () => calls }
  }

  it('serves a healthy report from memory for 5 minutes so public GETs do not fan out', async () => {
    const h = harness([up])

    await h.get()
    h.advance(4 * 60_000)
    await h.get()
    expect(h.calls()).toBe(1)

    h.advance(61_000)
    await h.get()
    expect(h.calls()).toBe(2)
  })

  it('re-checks a failing report within seconds so recovery shows quickly', async () => {
    const h = harness([down, up])

    expect(isHealthy(await h.get())).toBe(false)
    h.advance(6_000)

    expect(isHealthy(await h.get())).toBe(true)
  })

  it('shares one in-flight check between concurrent callers', async () => {
    const h = harness([up])

    await Promise.all(Array.from({ length: 10 }, () => h.get()))

    expect(h.calls()).toBe(1)
  })
})
