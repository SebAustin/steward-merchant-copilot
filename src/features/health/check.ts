export type CheckResult = boolean | 'skipped'

export type HealthReport = Readonly<{
  db: boolean
  /** PayPal OAuth + one read: skipped until credentials exist (slice 0.1c, full in 0.5b). */
  paypal: CheckResult
  /** Model reachability via the models list: skipped until a key exists (0.1c, full in 0.5b). */
  model: CheckResult
}>

type HealthDeps = Readonly<{
  pingDb: () => Promise<void>
  timeoutMs?: number
}>

const DEFAULT_TIMEOUT_MS = 3_000

function withTimeout(work: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Read-only health report: booleans only, never data or error text (R32). The PayPal and model
 * checks, and their 5-minute cache, arrive with their credentials in later slices.
 */
export async function checkHealth(deps: HealthDeps): Promise<HealthReport> {
  const db = await withTimeout(deps.pingDb(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS).then(
    () => true,
    () => false,
  )
  return { db, paypal: 'skipped', model: 'skipped' }
}

/** Healthy means no check failed; a skipped check is not a failure. */
export function isHealthy(report: HealthReport): boolean {
  return Object.values(report).every((result) => result !== false)
}
