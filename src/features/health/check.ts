export type SkippedCheck = 'paypal' | 'model'

export type HealthReport = Readonly<{
  /** Pass/fail booleans only, never data or error text (R32). */
  checks: Readonly<{ db: boolean }>
  /**
   * Checks that did not run because their credentials do not exist yet: PayPal OAuth + one read,
   * and model reachability via the models list. They arrive in 0.1c and 0.5b, and move into `checks`.
   */
  skipped: readonly SkippedCheck[]
}>

type HealthDeps = Readonly<{
  pingDb: () => Promise<void>
  timeoutMs?: number
  /** Receives the underlying failure (to log it); it never reaches the report. */
  onError?: (error: unknown) => void
}>

const DEFAULT_TIMEOUT_MS = 3_000
const HEALTHY_TTL_MS = 5 * 60_000
const UNHEALTHY_TTL_MS = 5_000

function withTimeout(work: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

/** Read-only health report. A slow or failing database is reported as down, never thrown. */
export async function checkHealth(deps: HealthDeps): Promise<HealthReport> {
  const db = await withTimeout(deps.pingDb(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS).then(
    () => true,
    (error: unknown) => {
      deps.onError?.(error)
      return false
    },
  )
  return { checks: { db }, skipped: ['paypal', 'model'] }
}

/** Healthy means no check failed; a skipped check is not a failure. */
export function isHealthy(report: HealthReport): boolean {
  return Object.values(report.checks).every(Boolean)
}

/**
 * Memoise health in-process (PLAN section 2, Health): a healthy result is reused for 5 minutes so
 * public GETs never fan out to the database, PayPal or the model; a failing result is reused for
 * only 5 seconds so recovery shows quickly. Concurrent callers share one in-flight check.
 */
export function createCachedHealth(
  run: () => Promise<HealthReport>,
  { now = Date.now }: Readonly<{ now?: () => number }> = {},
): () => Promise<HealthReport> {
  let cached: { report: HealthReport; expiresAt: number } | undefined
  let inflight: Promise<HealthReport> | undefined

  return async () => {
    if (cached && now() < cached.expiresAt) return cached.report
    inflight ??= run()
      .then((report) => {
        const ttl = isHealthy(report) ? HEALTHY_TTL_MS : UNHEALTHY_TTL_MS
        cached = { report, expiresAt: now() + ttl }
        return report
      })
      .finally(() => {
        inflight = undefined
      })
    return inflight
  }
}
